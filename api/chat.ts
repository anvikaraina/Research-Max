import type { IncomingMessage, ServerResponse } from 'http';
import { routeAIRequest } from '../lib/ai/router';

export const config = { runtime: 'nodejs' };

type Req = IncomingMessage & { body?: any; method?: string };

type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

const logMissingEnv = (key: string) => {
  console.error(`Missing ENV: ${key}`);
};

const performWebSearch = async (query: string): Promise<string> => {
  if (!process.env.TAVILY_API_KEY) {
    logMissingEnv('TAVILY_API_KEY');
    return '';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
      }),
    });

    if (!response.ok) return '';

    const data: any = await response.json();
    return data.results.map((r: any) => `Source: ${r.url}\nContent: ${r.content}`).join('\n\n');
  } catch (error) {
    console.error('[api/chat] Tavily search failed:', error);
    return '';
  }
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, modelId, searchEnabled } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: messages must be a non-empty array' });
    }

    let context = '';
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    if (searchEnabled) {
      context = await performWebSearch(lastUserMessage);
    }

    const enhancedMessages = [...messages];
    if (context) {
      enhancedMessages.push({
        role: 'system',
        content: `Web Search Results:\n${context}\n\nUse this information to answer the user's query if relevant. Cite sources if needed.`,
      });
    }

    const routed = await routeAIRequest(modelId, enhancedMessages);
    return res.status(200).json({ success: true, message: routed.message, provider: routed.provider, model: routed.model });
  } catch (error: any) {
    console.error('[api/chat] handler failure:', error);
    const status = error?.status || error?.statusCode || 500;
    return res.status(status).json({
      error: error?.message || 'Provider request failed',
      provider: error?.provider,
      model: error?.model,
    });
  }
}
