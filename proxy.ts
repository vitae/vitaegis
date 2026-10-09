import { NextResponse, type NextRequest } from 'next/server';

// Single-segment routes that should answer in any capitalization (/Bitcoin, /BITCOIN, ...).
const CASE_INSENSITIVE = new Set(['bitcoin', 'donate']);

export function proxy(req: NextRequest) {
  const slug = req.nextUrl.pathname.slice(1);
  const lower = slug.toLowerCase();
  if (slug !== lower && CASE_INSENSITIVE.has(lower)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${lower}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// Only top-level paths with no dot (skips /_next, /api/..., /eve/v1/..., files).
export const config = { matcher: '/:slug([^/.]+)' };
