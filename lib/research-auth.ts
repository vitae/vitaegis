import type { NextRequest } from 'next/server';

/** Same gate as the content review screen: the admin key, as a header or ?key=. */
export function researchAuthed(req: NextRequest) {
  const key = process.env.CONTENT_ADMIN_KEY;
  if (!key) return false;
  return req.headers.get('x-admin-key') === key || req.nextUrl.searchParams.get('key') === key;
}
