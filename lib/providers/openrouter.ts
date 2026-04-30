const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function callOpenRouter(model: string, message: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[openrouter] Missing OPENROUTER_API_KEY');
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://framr-ai.vercel.app',
      'X-Title': 'Framr AI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[openrouter] ${response.status} ${text}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response from OpenRouter.';
}
