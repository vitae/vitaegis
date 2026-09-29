import { NextRequest, NextResponse } from 'next/server';
import {
  audioUser,
  driveAccess,
  listAudioFiles,
  NeedsDriveLoginError,
} from '@/lib/keycrate/drive-audio';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET /api/keycrate/audio → every audio file in the user's (or the shared) Drive folder. */
export async function GET(req: NextRequest) {
  const auth = await audioUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const access = await driveAccess(req, auth.email).catch(() => null);
  if (!access) {
    return NextResponse.json(
      { error: 'Sign in to Google Drive to play your USB folder', needsLogin: true },
      { status: 428 },
    );
  }
  try {
    const list = await listAudioFiles(access);
    const res = NextResponse.json(list, { headers: { 'Cache-Control': 'private, max-age=60' } });
    access.user?.persist(res);
    return res;
  } catch (err) {
    if (err instanceof NeedsDriveLoginError) {
      return NextResponse.json(
        { error: err.message, needsLogin: !access.mine },
        { status: access.mine ? 404 : 428 },
      );
    }
    console.error('[keycrate] drive list failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not list the Drive folder' },
      { status: 502 },
    );
  }
}
