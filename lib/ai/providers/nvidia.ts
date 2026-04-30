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

export async function callNvidia(model: string, messages: ProviderMessages): Promise<string> {
  const client = new OpenAI({
    apiKey: requireEnv('NVIDIA_NIM_API_KEY'),
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from NVIDIA.';
}
