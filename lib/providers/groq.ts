const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function callGroq(model: string, message: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[groq] Missing GROQ_API_KEY');
    throw new Error('Missing GROQ_API_KEY');
  }

  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[groq] ${response.status} ${text}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response from Groq.';
}
