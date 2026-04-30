import OpenAI from 'openai';

type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

const requireKey = (providedKey: string | undefined, envKey: string): string => {
  const value = providedKey || process.env[envKey];
  if (!value) {
    const err: any = new Error('MISSING_PROVIDER_KEY');
    err.provider = 'openrouter';
    throw err;
  }
  return value;
};

export async function callOpenRouter(model: string, messages: ProviderMessages, providerKey?: string): Promise<string> {
  const client = new OpenAI({
    apiKey: requireKey(providerKey, 'OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://framr-ai.vercel.app',
      'X-Title': 'Framr AI',
    },
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from OpenRouter.';
}
