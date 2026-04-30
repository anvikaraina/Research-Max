import { resolveModel } from './models';
import { callGroq } from './providers/groq';
import { callOpenRouter } from './providers/openrouter';

export async function routeChat(model: string | undefined, message: string): Promise<string> {
  const resolved = resolveModel(model);

  const primary = async () => {
    if (resolved.provider === 'groq') return callGroq(resolved.providerModel, message);
    return callOpenRouter(resolved.providerModel, message);
  };

  const fallback = async () => {
    if (!resolved.fallback) throw new Error('No fallback configured');
    if (resolved.fallback.provider === 'groq') return callGroq(resolved.fallback.providerModel, message);
    return callOpenRouter(resolved.fallback.providerModel, message);
  };

  try {
    return await primary();
  } catch (error) {
    console.error('[router] Primary provider failed:', error);
    return await fallback();
  }
}
