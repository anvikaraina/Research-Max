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

export async function callGroq(model: string, messages: ProviderMessages): Promise<string> {
  const client = new OpenAI({
    apiKey: requireEnv('GROQ_API_KEY'),
    baseURL: 'https://api.groq.com/openai/v1',
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from Groq.';
}
