import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiter for AI chat requests
const chatLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { 
    success: false, 
    error: "Too many chat requests from this IP. Please try again after 15 minutes." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to get specialized clients
const getAIClient = (provider: string) => {
  if (process.env.NODE_ENV === "production") {
    console.log("Vercel deployment mode active");
  }

  switch (provider) {
    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        console.error("Missing GEMINI_API_KEY in environment variables");
      }
      return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    case 'groq':
      if (!process.env.GROQ_API_KEY) {
        console.error("Missing GROQ_API_KEY in environment variables");
      }
      return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    case 'openrouter':
      if (!process.env.OPENROUTER_API_KEY) {
        console.error("Missing OPENROUTER_API_KEY in environment variables");
      }
      return new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://framr-ai.vercel.app',
          'X-Title': 'Framr AI',
        },
      });
    case 'nvidia':
      if (!process.env.NVIDIA_NIM_API_KEY) {
        console.error("Missing NVIDIA_NIM_API_KEY in environment variables");
      }
      return new OpenAI({
        apiKey: process.env.NVIDIA_NIM_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
    default:
      return null;
  }
};

// Helper for default models per provider
const getDefaultModel = (provider: string) => {
  switch (provider) {
    case 'gemini': return 'gemini-2.0-flash';
    case 'groq': return 'llama-3.3-70b-versatile';
    case 'openrouter': return 'google/gemini-2.0-flash-001';
    case 'nvidia': return 'meta/llama-3.1-405b-instruct';
    default: return '';
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Multi-model routing endpoint
  app.post('/api/chat', chatLimit, async (req: any, res: any) => {
    const { messages, provider } = req.body;
    
    try {
      const client = getAIClient(provider);
      if (!client) {
        return res.status(400).json({ success: false, error: `Unsupported or unconfigured provider: ${provider}` });
      }

      let message = "";

      if (provider === 'gemini') {
        const geminiClient = client as GoogleGenerativeAI;
        const model = geminiClient.getGenerativeModel({ model: getDefaultModel(provider) });
        const result = await model.generateContent({
          contents: messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        });
        message = result.response.text();
      } else {
        const openaiClient = client as OpenAI;
        const response = await openaiClient.chat.completions.create({
          model: getDefaultModel(provider),
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        });
        message = response.choices[0]?.message?.content || "No response received from AI.";
      }

      res.json({ success: true, message });
    } catch (error: any) {
      console.error(`Error with ${provider}:`, error);
      
      const status = error.status || error.statusCode || 500;
      let errorMessage = error.message || 'Internal Server Error';
      
      if (status === 429) {
        errorMessage = `${provider.toUpperCase()} is currently experiencing high demand (Rate Limited). Please try again in a moment.`;
      }

      res.status(status).json({ 
        success: false,
        error: errorMessage,
        provider: provider
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
