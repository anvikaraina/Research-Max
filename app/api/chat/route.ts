import { routeChat } from '@/lib/router';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const model = typeof body?.model === 'string' ? body.model : undefined;

    if (!message) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    const reply = await routeChat(model, message);
    return Response.json({ reply });
  } catch (error: any) {
    console.error('[app/api/chat] request failed:', error);
    return Response.json({ error: error?.message || 'Unknown server error' }, { status: 500 });
  }
}
