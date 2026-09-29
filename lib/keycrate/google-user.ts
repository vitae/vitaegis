import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · the DJ's own Google Drive
   Signing in with Google asks for read-only Drive access. The browser hands the
   Google tokens to /api/keycrate/drive-login once; they live in an encrypted,
   httpOnly cookie tied to the signed-in email, and the server refreshes the access
   token with GOOGLE_OAUTH_CLIENT_ID / _SECRET (the client Supabase's Google provider
   uses). The browser never keeps a Drive token.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const DRIVE_COOKIE = 'kc_gdrive';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MAX_AGE = 60 * 60 * 24 * 180;

interface Sealed {
  email: string;
  rt: string | null;
  at: string;
  exp: number;
}

const clientId = () => process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || null;
const clientSecret = () => process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || null;
export const googleLoginConfigured = () => Boolean(clientId() && clientSecret());

function key(): Buffer {
  const secret = clientSecret();
  if (!secret) throw new Error('Google Drive login is not configured');
  return createHash('sha256').update(`keycrate-drive-cookie:${secret}`).digest();
}

function seal(v: Sealed): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(v), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url');
}

function open(raw: string | undefined): Sealed | null {
  if (!raw || !googleLoginConfigured()) return null;
  try {
    const buf = Buffer.from(raw, 'base64url');
    const d = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    return JSON.parse(json) as Sealed;
  } catch {
    return null;
  }
}

function setCookie(res: NextResponse, v: Sealed) {
  res.cookies.set(DRIVE_COOKIE, seal(v), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/keycrate',
    maxAge: MAX_AGE,
  });
}

export function clearDriveCookie(res: NextResponse) {
  res.cookies.set(DRIVE_COOKIE, '', { path: '/api/keycrate', maxAge: 0 });
}

/** The Google account an access token belongs to, or null if Google doesn't accept it. */
async function tokenEmail(accessToken: string): Promise<{ email: string; exp: number } | null> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string; exp?: string; scope?: string };
  if (!j.email || !j.scope?.includes('drive')) return null;
  return { email: j.email.toLowerCase(), exp: Number(j.exp) * 1000 || Date.now() + 50 * 60_000 };
}

/**
 * Stores the Google tokens from sign-in for `email`. Rejects tokens from another account or
 * without Drive access, so a stolen token can't be attached to someone else's session.
 */
export async function saveDriveLogin(
  res: NextResponse,
  email: string,
  accessToken: string,
  refreshToken: string | null,
  previous: string | undefined,
): Promise<string | null> {
  if (!googleLoginConfigured()) return 'Google Drive login is not configured';
  const info = await tokenEmail(accessToken);
  if (!info) return 'Google did not grant Drive access. Sign in again and allow it.';
  if (info.email !== email) return `That Google account isn't ${email}`;
  // Google only sends a refresh token on first consent; keep the one we already have.
  const kept = open(previous);
  const rt = refreshToken ?? (kept?.email === email ? kept.rt : null);
  setCookie(res, { email, rt, at: accessToken, exp: info.exp });
  return null;
}

export interface UserDrive {
  token: string;
  /** Call on the response when the access token was refreshed. */
  persist: (res: NextResponse) => void;
}

/** A live Drive access token for the signed-in `email`, refreshed if needed; null without a login. */
export async function userDriveToken(req: NextRequest, email: string): Promise<UserDrive | null> {
  const v = open(req.cookies.get(DRIVE_COOKIE)?.value);
  if (!v || v.email !== email) return null;
  if (v.exp - Date.now() > 60_000) return { token: v.at, persist: () => {} };
  if (!v.rt) return null;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId()!,
      client_secret: clientSecret()!,
      refresh_token: v.rt,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  const next: Sealed = {
    ...v,
    at: j.access_token,
    exp: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  return { token: next.at, persist: (r) => setCookie(r, next) };
}
