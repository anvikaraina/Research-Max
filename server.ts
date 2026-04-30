import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Main API Route for Chat with Priority Logic
  app.post("/api/chat", async (req, res) => {
    const { messages, stream = true, provider: requestedProvider, modelId: requestedModel } = req.body;

    const availableProviders = [
      {
        name: "nvidia",
        apiKey: process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY,
        baseURL: "https://integrate.api.nvidia.com/v1",
        defaultModel: "openai/gpt-oss-120b"
      },
      {
        name: "openrouter",
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultModel: "openai/gpt-oss-120b"
      },
      {
        name: "groq",
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
        defaultModel: "llama-3.3-70b-versatile"
      },
      {
        name: "google",
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        defaultModel: "gemini-1.5-flash"
      }
    ].filter(p => p.apiKey && p.apiKey !== "" && !p.apiKey.startsWith("MY_"));

    if (availableProviders.length === 0) {
      console.error("DEBUG: No AI provider keys configured in backend environment.");
      return res.status(500).json({ reply: "No AI provider keys configured in backend environment." });
    }

    // Determine initial provider list based on priority: NVIDIA > OpenRouter > Others
    let providers = [...availableProviders];
    
    // If a specific provider was requested from frontend, we still want to follow the user's priority 
    // but starting with their choice if it's one of the preferred ones, or just use the whole list 
    // and let the priority logic handle it.
    // The user specifically wants GPT-OSS 120B via NVIDIA first.
    
    let lastError: any = null;
    const MAX_RETRIES = 2;

    for (const config of providers) {
      // Logic check: if user selects a model that doesn't belong to this provider, we might skip or override.
      // But user wants GPT-OSS 120B to be tried on NVIDIA then OpenRouter.
      const targetModel = requestedModel || config.defaultModel;
      const requestURL = `${config.baseURL}/chat/completions`;

      console.log(`\n[AI ROUTER] Initializing request...`);
      console.log(`[AI ROUTER] Provider: ${config.name}`);
      console.log(`[AI ROUTER] Model: ${targetModel}`);
      console.log(`[AI ROUTER] Endpoint: ${requestURL}`);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) console.log(`[AI ROUTER] Retry attempt ${attempt}/${MAX_RETRIES} for ${config.name}...`);
          
          const response = await fetch(requestURL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.apiKey}`,
              ...(config.name === "openrouter" ? {
                "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                "X-Title": "Framr AI"
              } : {})
            },
            body: JSON.stringify({
              model: targetModel,
              messages: messages,
              stream: stream,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData = {};
            try { errorData = JSON.parse(errorText); } catch(e) {}
            
            console.error(`[AI ROUTER] ${config.name} failed (Status ${response.status})`);
            console.error(`[AI ROUTER] Error Response:`, errorText);
            
            lastError = { status: response.status, data: errorData, name: config.name };
            
            // If it's a 401/403/404, we usually don't retry same provider
            if (response.status === 401 || response.status === 403 || response.status === 404) break;
            continue; // Try next attempt for THIS provider
          }

          console.log(`[AI ROUTER] ${config.name} SUCCESS. Delivering response...`);

          if (stream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-AI-Provider", config.name);
            res.setHeader("X-AI-Model", targetModel);
            
            response.body?.pipe(res);
            return;
          } else {
            const data: any = await response.json();
            return res.json({ 
              reply: data.choices?.[0]?.message?.content || "No response content",
              provider: config.name,
              model: targetModel
            });
          }
        } catch (error: any) {
          console.error(`[AI ROUTER] ${config.name} connection error:`, error.message);
          lastError = { error: error.message, name: config.name };
        }
      }
      
      console.warn(`[AI ROUTER] ${config.name} exhausted. Fallback reason: Provider unreachable or returned persistent errors.`);
    }

    console.error(`[AI ROUTER] ALL PROVIDERS FAILED.`);
    res.status(500).json({ 
      reply: "Intelligence routing failed: All configured providers were unable to process the request.",
      details: lastError
    });
  });

  // Keep old proxy route for backward compatibility if needed, but the main one is /api/chat
  app.post("/api/chat/proxy", async (req, res) => {
    const { provider, model, messages, stream } = req.body;

    try {
      let endpoint = "";
      let apiKey = "";
      let body = {};

      if (provider === "groq") {
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        apiKey = process.env.GROQ_API_KEY || "";
        body = { model, messages, stream };
      } else if (provider === "nvidia") {
        endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
        apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY || "";
        body = { model: model || "meta/llama-3.1-70b-instruct", messages, stream };
      } else if (provider === "openrouter") {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        apiKey = process.env.OPENROUTER_API_KEY || "";
        body = { 
          model, 
          messages, 
          stream,
          headers: {
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-Title": "Framr AI"
          }
        };
      }

      if (!apiKey) {
        return res.status(401).json({ error: `API key for ${provider} not configured.` });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (stream) {
        // Forward the stream
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        response.body?.pipe(res);
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to communicate with AI provider" });
    }
  });

  // Tavily Search API Proxy
  app.post("/api/tavily/search", async (req, res) => {
    const { query } = req.body;
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      console.warn("[TAVILY] API key not found");
      return res.status(500).json({ error: "Tavily API key not configured" });
    }

    try {
      console.log(`[TAVILY] Request Started: "${query}"`);
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "basic",
          max_results: 5,
          include_answer: true
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TAVILY] API Failure:`, errText);
        return res.status(response.status).json({ error: "Tavily search failed" });
      }

      const data = await response.json();
      console.log(`[TAVILY] Response received successfully`);
      return res.json(data);
    } catch (error: any) {
      console.error(`[TAVILY] Network error:`, error.message);
      return res.status(500).json({ error: "Internal server error during search" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
