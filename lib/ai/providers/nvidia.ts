import OpenAI from 'openai';

type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

const requireKey = (providedKey: string | undefined, envKey: string): string => {
  const value = providedKey || process.env[envKey];
  if (!value) {
    const err: any = new Error('MISSING_PROVIDER_KEY');
    err.provider = 'nvidia';
    throw err;
  }
  return value;
};

export async function callNvidia(model: string, messages: ProviderMessages, providerKey?: string): Promise<string> {
  const client = new OpenAI({
    apiKey: requireKey(providerKey, 'NVIDIA_NIM_API_KEY'),
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content || 'No response received from NVIDIA.';
}
