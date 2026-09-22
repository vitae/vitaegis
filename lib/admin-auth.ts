import type { NextRequest } from 'next/server';

/**
 * One gate for every admin screen and route: the CONTENT_ADMIN_KEY env var, sent as an
 * x-admin-key header or ?key= query. There are no admin accounts; whoever holds the key
 * is the admin, so keep it out of anything client-side except the browser's own storage.
 */
export function adminAuthed(req: NextRequest) {
  const key = process.env.CONTENT_ADMIN_KEY;
  if (!key) return false;
  return req.headers.get('x-admin-key') === key || req.nextUrl.searchParams.get('key') === key;
}
