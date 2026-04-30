import OpenAI from 'openai';

export type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing ENV: ${key}`);
    throw new Error(`Missing ENV: ${key}`);
  }
  return value;
};

export async function callNvidia(model: string, messages: ProviderMessages): Promise<string> {
  const apiKey = requireEnv('NVIDIA_NIM_API_KEY');
  const client = new OpenAI({ apiKey, baseURL: 'https://integrate.api.nvidia.com/v1' });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from NVIDIA.';
}

export async function callGroq(model: string, messages: ProviderMessages): Promise<string> {
  const apiKey = requireEnv('GROQ_API_KEY');
  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from Groq.';
}

export async function callOpenRouter(model: string, messages: ProviderMessages): Promise<string> {
  const apiKey = requireEnv('OPENROUTER_API_KEY');
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://framr-ai.vercel.app',
      'X-Title': 'Framr AI',
    },
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from OpenRouter.';
}
