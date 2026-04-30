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
type ProviderName = 'gemini' | 'groq' | 'openrouter' | 'nvidia';
type ResolvedModel = { provider: ProviderName; model: string; uiModel: string };

const MODEL_REGISTRY: Record<string, ResolvedModel> = {
  'gpt-5.4': { provider: 'nvidia', model: 'gpt-oss-120b', uiModel: 'gpt-5.4' },
  'manus-1.6': { provider: 'groq', model: 'llama-70b', uiModel: 'manus-1.6' },
  'gemini-3-pro': { provider: 'openrouter', model: 'gemma-27b', uiModel: 'gemini-3-pro' },
};
const MODEL_ALIASES: Record<string, string> = {
  'gpt-5-4': 'gpt-5.4',
  'manus-1-6': 'manus-1.6',
  'meta/llama-3.1-405b-instruct': 'gpt-5.4',
  'llama3-70b-8192': 'manus-1.6',
  'google/gemma-2-27b-it': 'gemini-3-pro',
};
const ACTIVE_AI_PROVIDER = process.env.ACTIVE_AI_PROVIDER?.trim().toLowerCase();

const resolveUiModel = (modelId: unknown): ResolvedModel => {
  const normalized = typeof modelId === 'string' ? modelId.trim().toLowerCase() : '';
  const canonicalName = MODEL_REGISTRY[normalized]
    ? normalized
    : MODEL_ALIASES[normalized];

  if (!canonicalName || !MODEL_REGISTRY[canonicalName]) {
    throw new Error(`Unknown model '${modelId}'. Expected one of: ${Object.keys(MODEL_REGISTRY).join(', ')}`);
  }

  return MODEL_REGISTRY[canonicalName];
};

const logMissingEnv = (key: string) => {
  console.error(`Missing ENV: ${key}`);
};

// Helper to fetch search results from Tavily
const performWebSearch = async (query: string): Promise<string> => {
  if (!process.env.TAVILY_API_KEY) {
    logMissingEnv('TAVILY_API_KEY');
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
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Multi-model routing endpoint
  app.post('/api/chat', chatLimit, async (req: any, res: any) => {
    const { messages, provider, modelId, searchEnabled } = req.body;
    const normalizedProvider = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
      const resolvedModel = resolveUiModel(modelId);
      const requestedProvider = (ACTIVE_AI_PROVIDER || resolvedModel.provider) as ProviderName;
    
    try {
      if (!SUPPORTED_PROVIDERS.has(requestedProvider)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported or unconfigured provider: ${provider || 'undefined'}`,
          provider: requestedProvider || provider
        });
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: messages must be a non-empty array',
          provider: requestedProvider
        });
      }

      const keyPresent = hasProviderKey(requestedProvider);

      console.log(`[chat] AI Provider: ${requestedProvider}`);
      console.log(`[chat] UI Model: ${resolvedModel.uiModel}`);
      console.log(`[chat] Model: ${resolvedModel.model}`);
      console.log(`[chat] API Key Present: ${keyPresent}`);
      console.log(`[chat] GEMINI key present: ${hasProviderKey('gemini')}`);
      console.log(`[chat] GROQ key present: ${hasProviderKey('groq')}`);
      console.log(`[chat] OPENROUTER key present: ${hasProviderKey('openrouter')}`);
      console.log(`[chat] NVIDIA key present: ${hasProviderKey('nvidia')}`);
      console.log(`[chat] TAVILY key present: ${Boolean(process.env.TAVILY_API_KEY)}`);

      if (!keyPresent) {
        const missingKeyError = getMissingKeyError(requestedProvider);
        const missingKeyName = missingKeyError.replace('Missing ', '').replace(' in environment variables', '');
        logMissingEnv(missingKeyName);
        return res.status(500).json({
          success: false,
          error: 'AI provider configuration failed',
          missing_env_check: true,
          provider: requestedProvider,
          detail: missingKeyError
        });
      }

      const client = getAIClient(requestedProvider);
      if (!client) {
        return res.status(400).json({ success: false, error: `Unsupported or unconfigured provider: ${requestedProvider}` });
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

      if (requestedProvider === 'gemini') {
        const geminiClient = client as GoogleGenerativeAI;
        const model = geminiClient.getGenerativeModel({ model: resolvedModel.model || getDefaultModel(requestedProvider) });
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
          model: resolvedModel.model || getDefaultModel(requestedProvider),
          messages: enhancedMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        });
        message = response.choices[0]?.message?.content || "No response received from AI.";
      }

      res.json({ success: true, message });
    } catch (error: any) {
      console.error(`[chat] Provider request failed for ${requestedProvider}:`, error);

      const status = error?.status || error?.statusCode || 500;
      const isRateLimit = status === 429;
      const errorMessage = isRateLimit
        ? `${provider.toUpperCase()} is currently experiencing high demand (Rate Limited). Please try again in a moment.`
        : `Provider request failed: ${error?.message || 'Unknown provider error'}`;

      res.status(status).json({
        success: false,
        error: 'AI provider configuration failed',
        missing_env_check: false,
        provider: requestedProvider,
        detail: errorMessage
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
