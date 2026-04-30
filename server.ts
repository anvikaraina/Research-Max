import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { routeAIRequest } from './lib/aiRouter';

dotenv.config();

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
    const { messages, modelId, searchEnabled } = req.body;
    
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: messages must be a non-empty array',
          missing_env_check: false
        });
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

      const routed = await routeAIRequest(modelId, enhancedMessages);
      res.json({ success: true, message: routed.message, provider: routed.provider, model: routed.model });
    } catch (error: any) {
      console.error('[chat] AI routing/provider failure:', error);

      const status = error?.status || error?.statusCode || 500;

      res.status(status).json({
        success: false,
        error: error?.message || 'Provider request failed',
        missing_env_check: Boolean(error?.message?.includes('Missing ENV')),
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
