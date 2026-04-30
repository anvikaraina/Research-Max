import { resolveModel } from './modelRegistry';
import { callGroq, callNvidia, callOpenRouter, type ProviderMessages } from './providers';

export async function routeAIRequest(modelId: unknown, messages: ProviderMessages): Promise<{ provider: string; model: string; message: string }> {
  const resolved = resolveModel(modelId);

  console.log(`[aiRouter] Provider: ${resolved.provider}`);
  console.log(`[aiRouter] UI Model: ${resolved.uiModel}`);
  console.log(`[aiRouter] API Model: ${resolved.model}`);

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
}
