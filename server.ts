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

// Helper to check if a provider key exists without exposing secret values
const hasProviderKey = (provider: string): boolean => {
  switch (provider) {
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY);
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY);
    case 'openrouter':
      return Boolean(process.env.OPENROUTER_API_KEY);
    case 'nvidia':
      return Boolean(process.env.NVIDIA_NIM_API_KEY);
    default:
      return false;
  }
};

const getMissingKeyError = (provider: string): string => {
  switch (provider) {
    case 'gemini':
      return 'Missing GEMINI_API_KEY in environment variables';
    case 'groq':
      return 'Missing GROQ_API_KEY in environment variables';
    case 'openrouter':
      return 'Missing OPENROUTER_API_KEY in environment variables';
    case 'nvidia':
      return 'Missing NVIDIA_NIM_API_KEY in environment variables';
    default:
      return `Unsupported provider: ${provider}`;
  }
};

// Helper to get specialized clients
const getAIClient = (provider: string) => {
  if (process.env.NODE_ENV === "production") {
    console.log("Vercel deployment mode active");
  }

  switch (provider) {
    case 'gemini':
      return new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    case 'groq':
      return new OpenAI({
        apiKey: process.env.GROQ_API_KEY as string,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    case 'openrouter':
      return new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY as string,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://framr-ai.vercel.app',
          'X-Title': 'Framr AI',
        },
      });
    case 'nvidia':
      return new OpenAI({
        apiKey: process.env.NVIDIA_NIM_API_KEY as string,
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

const SUPPORTED_PROVIDERS = new Set(['gemini', 'groq', 'openrouter', 'nvidia']);

// Helper to fetch search results from Tavily
const performWebSearch = async (query: string): Promise<string> => {
  if (!process.env.TAVILY_API_KEY) {
    console.warn("Tavily API key missing, skipping web search.");
    return "";
  }
  
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        max_results: 5
      })
    });
    
    if (!response.ok) return "";
    
    const data: any = await response.json();
    return data.results.map((r: any) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");
  } catch (error) {
    console.error("Tavily search failed:", error);
    return "";
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
    const { messages, provider, modelId, searchEnabled } = req.body;
    
    try {
      if (!SUPPORTED_PROVIDERS.has(provider)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported or unconfigured provider: ${provider}`,
          provider
        });
      }

      const keyPresent = hasProviderKey(provider);
      const resolvedModel = modelId || getDefaultModel(provider);

      console.log(`[chat] provider=${provider} model=${resolvedModel} search=${Boolean(searchEnabled)}`);
      console.log(`[chat] GEMINI key present: ${hasProviderKey('gemini')}`);
      console.log(`[chat] GROQ key present: ${hasProviderKey('groq')}`);
      console.log(`[chat] OPENROUTER key present: ${hasProviderKey('openrouter')}`);
      console.log(`[chat] NVIDIA key present: ${hasProviderKey('nvidia')}`);
      console.log(`[chat] TAVILY key present: ${Boolean(process.env.TAVILY_API_KEY)}`);

      if (!keyPresent) {
        const missingKeyError = getMissingKeyError(provider);
        console.error(`[chat] ${missingKeyError}`);
        return res.status(500).json({
          success: false,
          error: missingKeyError,
          provider
        });
      }

      const client = getAIClient(provider);
      if (!client) {
        return res.status(400).json({ success: false, error: `Unsupported or unconfigured provider: ${provider}` });
      }

      // 1. Web Search Augmentation if required
      let context = "";
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      
      if (searchEnabled) {
        context = await performWebSearch(lastUserMessage);
      }

      const enhancedMessages = [...messages];
      if (context) {
        enhancedMessages.push({
          role: "system",
          content: `Web Search Results:\n${context}\n\nUse this information to answer the user's query if relevant. Cite sources if needed.`
        });
      }

      let message = "";

      if (provider === 'gemini') {
        const geminiClient = client as GoogleGenerativeAI;
        const model = geminiClient.getGenerativeModel({ model: resolvedModel });
        const result = await model.generateContent({
          contents: enhancedMessages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        });
        message = result.response.text();
      } else {
        const openaiClient = client as OpenAI;
        const response = await openaiClient.chat.completions.create({
          model: resolvedModel,
          messages: enhancedMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        });
        message = response.choices[0]?.message?.content || "No response received from AI.";
      }

      res.json({ success: true, message });
    } catch (error: any) {
      console.error(`[chat] Provider request failed for ${provider}:`, error);

      const status = error?.status || error?.statusCode || 500;
      const isRateLimit = status === 429;
      const errorMessage = isRateLimit
        ? `${provider.toUpperCase()} is currently experiencing high demand (Rate Limited). Please try again in a moment.`
        : `Provider request failed: ${error?.message || 'Unknown provider error'}`;

      res.status(status).json({
        success: false,
        error: errorMessage,
        provider
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
