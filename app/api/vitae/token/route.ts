import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ORIGINS } from '@/lib/keycrate/public-origin';
import { ElevenLabs, ElevenLabsError } from '@/lib/vitae/elevenlabs';
import { vitaeServerEnabled } from '@/lib/vitae/env';

export const dynamic = 'force-dynamic';

/** POST → { token }: a single-use ElevenLabs WebRTC token for the Vitae agent. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && !PUBLIC_ORIGINS.has(origin.toLowerCase()) && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!vitaeServerEnabled()) {
    return NextResponse.json({ error: 'Vitae is not configured' }, { status: 503 });
  }
  try {
    const el = new ElevenLabs(process.env.ELEVENLABS_API_KEY!);
    const token = await el.conversationToken(process.env.ELEVENLABS_AGENT_ID!.trim());
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const status = err instanceof ElevenLabsError ? err.status : 0;
    console.error('[vitae] token failed', status, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Vitae is away. Try again.' }, { status: 502 });
  }
}
