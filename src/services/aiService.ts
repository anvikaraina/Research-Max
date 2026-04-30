import { GoogleGenAI } from '@google/genai';

export enum AIProvider {
  GEMINI = 'gemini',
  GROQ = 'groq',
  NVIDIA = 'nvidia',
  OPENROUTER = 'openrouter'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

/**
 * Optimized chunked streaming simulation.
 * Delivers content in semantic batches (words/sentences) to prevent UI stall.
 */
export async function streamResponse(
  fullText: string, 
  onUpdate: (currentText: string) => void,
  onComplete: () => void
): Promise<void> {
  const CHUNK_SIZE_MIN = 20;
  const CHUNK_SIZE_MAX = 50;
  const BATCH_INTERVAL = 40; // ms between updates

  let currentIndex = 0;
  let accumulatedText = "";

  const stream = async () => {
    if (currentIndex >= fullText.length) {
      onComplete();
      return;
    }

    // Determine how many characters to add in this batch
    const remaining = fullText.length - currentIndex;
    const size = Math.min(
      remaining, 
      Math.floor(Math.random() * (CHUNK_SIZE_MAX - CHUNK_SIZE_MIN + 1) + CHUNK_SIZE_MIN)
    );

    accumulatedText += fullText.slice(currentIndex, currentIndex + size);
    currentIndex += size;

    onUpdate(accumulatedText);

    // Dynamic delay: longer for large responses to prevent browser lag
    const delay = fullText.length > 1000 ? BATCH_INTERVAL / 2 : BATCH_INTERVAL;
    
    setTimeout(stream, delay);
  };

  stream();
}

export async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: `Generate a concise 3-5 word title for a chat that starts with: "${firstMessage}". Return ONLY the title, no quotes or punctuation.` }], 
        provider: AIProvider.GROQ
      })
    });
    
    if (!response.ok) return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    
    const data = await response.json();
    return data.message.replace(/["']/g, '').trim() || firstMessage.slice(0, 30);
  } catch (error) {
    console.error('Title generation failed:', error);
    return firstMessage.slice(0, 30);
  }
}

export async function chatWithAI(
  messages: ChatMessage[], 
  provider: AIProvider = AIProvider.GEMINI,
  modelId?: string,
  searchEnabled: boolean = false,
  providerKeys?: { groq?: string; openrouter?: string; nvidia?: string }
): Promise<string> {
  const endpoint = '/api/chat';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, provider, modelId, searchEnabled, providerKeys })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const baseMessage = errorData.error || errorData.detail || 'Failed to fetch from AI provider';
      const message = response.status === 429
        ? `${provider.toUpperCase()} is currently experiencing high demand. Please try again in a moment.`
        : baseMessage;
      const enriched = new Error(`AI request failed: ${message}`);
      (enriched as any).context = { endpoint, provider, modelId };
      (enriched as any).status = response.status;
      (enriched as any).payload = errorData;
      throw enriched;
    }
    
    const data = await response.json();
    return data.message;
  } catch (error: any) {
    console.error('Chat Error:', error, error?.context ? { context: error.context } : '');
    throw error;
  }
}
