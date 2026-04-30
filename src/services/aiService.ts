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

export async function chatWithAI(messages: ChatMessage[], provider: AIProvider = AIProvider.GEMINI): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, provider })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error(`${provider.toUpperCase()} is currently experiencing high demand. Please try again in a moment.`);
      }
      throw new Error(errorData.error || 'Failed to fetch from AI provider');
    }
    
    const data = await response.json();
    return data.message;
  } catch (error: any) {
    console.error('Chat Error:', error);
    throw error;
  }
}
