import type { IncomingMessage, ServerResponse } from 'http';

export const config = { runtime: 'nodejs' };

type Req = IncomingMessage & { method?: string };
type Res = ServerResponse & { status: (code: number) => Res; json: (body: unknown) => void };

export default function handler(req: Req, res: Res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
}
