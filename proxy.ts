import { NextResponse, type NextRequest } from 'next/server';
import {
  PROJECTS_UNLOCK_PATH,
  accessCookie,
  accessSecret,
  lockedProject,
  verifyAccess,
} from '@/lib/projects-access';

// Single-segment routes that should answer in any capitalization (/Bitcoin, /BITCOIN, ...).
const CASE_INSENSITIVE = new Set(['bitcoin', 'donate', 'gnomerogue']);

export async function proxy(req: NextRequest) {
  // Paid projects: without that project's access cookie, show the pay window instead.
  const locked = lockedProject(req.nextUrl.pathname);
  const secret = accessSecret();
  if (
    locked &&
    secret &&
    !(await verifyAccess(req.cookies.get(accessCookie(locked))?.value, locked, secret))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = PROJECTS_UNLOCK_PATH;
    url.search = `?next=${encodeURIComponent(locked)}`;
    return NextResponse.redirect(url);
  }

  const slug = req.nextUrl.pathname.slice(1);
  const lower = slug.toLowerCase();
  if (slug !== lower && CASE_INSENSITIVE.has(lower)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${lower}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// Top-level paths with no dot (skips /_next, /api/..., /eve/v1/..., files), plus everything
// under a paid project. Keep these in step with LOCKED_PROJECTS; Next needs them literal.
export const config = {
  matcher: ['/:slug([^/.]+)', '/travel/:path*', '/stocks/:path*', '/vitamins/:path*'],
};
