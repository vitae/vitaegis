import { NextRequest, NextResponse } from 'next/server';
import { audioMime, planRange } from '@/lib/keycrate/audio';
import { audioUser, fetchAudio, inAudioFolder } from '@/lib/keycrate/drive-audio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/keycrate/audio/:id → one audio file from the Drive folder, with byte ranges so the
 * <audio> element can seek. Open-ended ranges are served in 8 MB slices; the browser asks for
 * the next slice as it plays.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{10,200}$/.test(id))
    return NextResponse.json({ error: 'Bad file id' }, { status: 400 });
  const auth = await audioUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const meta = await inAudioFolder(id);
  if (!meta) return NextResponse.json({ error: 'Not in the audio folder' }, { status: 404 });

  const range = planRange(req.headers.get('range'), meta.size);
  if (range === 'invalid') {
    return new NextResponse(null, {
      status: 416,
      headers: meta.size === null ? {} : { 'Content-Range': `bytes */${meta.size}` },
    });
  }

  const upstream = await fetchAudio(id, range);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Drive returned ${upstream.status}` }, { status: 502 });
  }

  const headers = new Headers({
    'Content-Type': audioMime(meta.name, meta.mimeType),
    'Accept-Ranges': 'bytes',
    // Private music: never cached by a CDN, only by this browser.
    'Cache-Control': 'private, max-age=3600',
  });
  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  // Only claim a partial response when Drive actually sent one.
  const partial = upstream.status === 206;
  if (partial) {
    const total = meta.size ?? '*';
    headers.set(
      'Content-Range',
      upstream.headers.get('content-range') ?? `bytes ${range?.start}-${range?.end}/${total}`,
    );
  }
  return new NextResponse(upstream.body, { status: partial ? 206 : 200, headers });
}
