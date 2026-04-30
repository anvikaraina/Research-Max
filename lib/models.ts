export type Provider = 'groq' | 'openrouter';

export type ModelConfig = {
  id: string;
  provider: Provider;
  providerModel: string;
  fallback?: { provider: Provider; providerModel: string };
};

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'fast': {
    id: 'fast',
    provider: 'groq',
    providerModel: 'llama-3.1-8b-instant',
    fallback: { provider: 'openrouter', providerModel: 'meta-llama/llama-3.1-70b-instruct' },
  },
  'smart': {
    id: 'smart',
    provider: 'groq',
    providerModel: 'llama-3-70b-instruct',
    fallback: { provider: 'openrouter', providerModel: 'meta-llama/llama-3.1-70b-instruct' },
  },
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    provider: 'openrouter',
    providerModel: 'google/gemma-2-27b-it',
    fallback: { provider: 'groq', providerModel: 'llama-3-70b-instruct' },
  },
  'gpt-oss-120b': {
    id: 'gpt-oss-120b',
    provider: 'openrouter',
    providerModel: 'meta-llama/llama-3.1-70b-instruct',
    fallback: { provider: 'groq', providerModel: 'llama-3-70b-instruct' },
  },
};

export function resolveModel(model?: string): ModelConfig {
  if (!model) return MODEL_REGISTRY.fast;
  const normalized = model.trim().toLowerCase();
  return MODEL_REGISTRY[normalized] || MODEL_REGISTRY.fast;
}
