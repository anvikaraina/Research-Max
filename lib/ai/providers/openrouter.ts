import OpenAI from 'openai';

type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing ENV: ${key}`);
    throw new Error(`Missing ENV: ${key}`);
  }
  return value;
};

export async function callOpenRouter(model: string, messages: ProviderMessages): Promise<string> {
  const client = new OpenAI({
    apiKey: requireEnv('OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://framr-ai.vercel.app',
      'X-Title': 'Framr AI',
    },
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from OpenRouter.';
}
