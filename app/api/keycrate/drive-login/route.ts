import { NextRequest, NextResponse } from 'next/server';
import { audioUser } from '@/lib/keycrate/drive-audio';
import { clearDriveCookie, DRIVE_COOKIE, saveDriveLogin } from '@/lib/keycrate/google-user';

export const dynamic = 'force-dynamic';

/**
 * POST /api/keycrate/drive-login { accessToken, refreshToken } → keeps the Google tokens from
 * sign-in in an encrypted httpOnly cookie, after checking they belong to the signed-in user.
 * DELETE forgets them (sign-out).
 */
export async function POST(req: NextRequest) {
  const auth = await audioUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => null)) as {
    accessToken?: string;
    refreshToken?: string | null;
  } | null;
  if (!body?.accessToken) {
    return NextResponse.json({ error: 'Missing Google token' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  const error = await saveDriveLogin(
    res,
    auth.email,
    body.accessToken,
    body.refreshToken ?? null,
    req.cookies.get(DRIVE_COOKIE)?.value,
  );
  if (error) return NextResponse.json({ error }, { status: 400 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearDriveCookie(res);
  return res;
}
