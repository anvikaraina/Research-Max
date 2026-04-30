import OpenAI from 'openai';

type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

const requireKey = (providedKey: string | undefined, envKey: string): string => {
  const value = providedKey || process.env[envKey];
  if (!value) {
    const err: any = new Error('MISSING_PROVIDER_KEY');
    err.provider = 'groq';
    throw err;
  }
  return value;
};

export async function callGroq(model: string, messages: ProviderMessages, providerKey?: string): Promise<string> {
  const client = new OpenAI({
    apiKey: requireKey(providerKey, 'GROQ_API_KEY'),
    baseURL: 'https://api.groq.com/openai/v1',
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from Groq.';
}
