import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function secretsMatch(sent: string | null | undefined, expected: string | undefined) {
  if (!sent || !expected) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * One gate for every admin screen and route: the CONTENT_ADMIN_KEY env var, sent as an
 * x-admin-key header. There are no admin accounts; whoever holds the key is the admin, so
 * keep it out of anything client-side except the browser's own storage.
 */
export function adminAuthed(req: Request) {
  return secretsMatch(req.headers.get('x-admin-key'), process.env.CONTENT_ADMIN_KEY);
}

export const adminAuthedRequest = adminAuthed;

/**
 * For the few GET links the operator opens by navigation, which cannot send a header: the
 * key may also arrive as ?key=. A key in a URL ends up in browser history and logs, so no
 * route that changes anything accepts it this way.
 */
export function adminAuthedByLink(req: NextRequest) {
  return (
    adminAuthed(req) ||
    secretsMatch(req.nextUrl.searchParams.get('key'), process.env.CONTENT_ADMIN_KEY)
  );
}

/**
 * Vercel cron sends CRON_SECRET as a bearer token. With no secret set, the route is open in
 * local development only.
 */
export function cronAuthed(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return secretsMatch(req.headers.get('authorization'), `Bearer ${secret}`);
}
