export type ProviderName = 'nvidia' | 'groq' | 'openrouter';

export interface ResolvedModel {
  uiModel: string;
  provider: ProviderName;
  model: string;
}

const REGISTRY: Readonly<Record<string, ResolvedModel>> = Object.freeze({
  'gpt-5.4': Object.freeze({ uiModel: 'gpt-5.4', provider: 'nvidia', model: 'gpt-oss-120b' }),
  'manus-1.6': Object.freeze({ uiModel: 'manus-1.6', provider: 'groq', model: 'llama-70b' }),
  'gemini-3-pro': Object.freeze({ uiModel: 'gemini-3-pro', provider: 'openrouter', model: 'gemma-27b' }),
});

const ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'gpt-5-4': 'gpt-5.4',
  'manus-1-6': 'manus-1.6',
  'openai/gpt-oss-120b': 'gpt-5.4',
  'llama3-70b-8192': 'manus-1.6',
  'google/gemma-2-27b-it': 'gemini-3-pro',
});

export function resolveModel(modelId: unknown): ResolvedModel {
  const normalized = typeof modelId === 'string' ? modelId.trim().toLowerCase() : '';
  const canonical = REGISTRY[normalized] ? normalized : ALIASES[normalized];

  if (!canonical || !REGISTRY[canonical]) {
    console.error('[ai.registry] Unknown model requested', { modelId });
    throw new Error(`Unknown model '${modelId}'. Allowed: ${Object.keys(REGISTRY).join(', ')}`);
  }

  return REGISTRY[canonical];
}
