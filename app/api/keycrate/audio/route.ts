import { NextRequest, NextResponse } from 'next/server';
import { audioUser, FolderNotSharedError, listAudioFiles } from '@/lib/keycrate/drive-audio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/keycrate/audio → every audio file in the linked Google Drive folder. */
export async function GET(req: NextRequest) {
  const auth = await audioUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const list = await listAudioFiles();
    return NextResponse.json(list, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (err) {
    if (err instanceof FolderNotSharedError) {
      return NextResponse.json({ error: err.message, needsShare: true }, { status: 404 });
    }
    console.error('[keycrate] drive list failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not list the Drive folder' },
      { status: 502 },
    );
  }
}
