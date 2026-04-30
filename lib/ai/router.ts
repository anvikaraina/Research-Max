import { resolveModel } from './registry';
import { callNvidia } from './providers/nvidia';
import { callGroq } from './providers/groq';
import { callOpenRouter } from './providers/openrouter';

export type ProviderMessages = Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

export async function routeAIRequest(modelId: unknown, messages: ProviderMessages): Promise<{ provider: string; model: string; message: string }> {
  const resolved = resolveModel(modelId);

  console.log('[ai.router] Routing request', {
    provider: resolved.provider,
    uiModel: resolved.uiModel,
    model: resolved.model,
  });

  try {
    switch (resolved.provider) {
      case 'nvidia':
        return { provider: resolved.provider, model: resolved.model, message: await callNvidia(resolved.model, messages) };
      case 'groq':
        return { provider: resolved.provider, model: resolved.model, message: await callGroq(resolved.model, messages) };
      case 'openrouter':
        return { provider: resolved.provider, model: resolved.model, message: await callOpenRouter(resolved.model, messages) };
      default:
        throw new Error(`Unsupported provider: ${resolved.provider}`);
    }
  } catch (error) {
    console.error('[ai.router] Provider call failed', error);
    throw error;
  }
}
