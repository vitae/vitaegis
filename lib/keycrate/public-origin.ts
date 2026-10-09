import type { NextRequest } from 'next/server';

/** Hosts allowed to serve KeyCrate, so a forged value can't send Stripe back to a stranger's site. */
export const PUBLIC_ORIGINS = new Set([
  'https://www.vitaegis.com',
  'https://vitaegis.com',
  'https://www.glowwitdaflow.com',
  'https://glowwitdaflow.com',
  'http://localhost:3000',
]);

/**
 * The origin the visitor is actually on. KeyCrate is proxied at glowwitdaflow.com/keycrate by a
 * rewrite in the GWDF site, and Vercel forwards nothing that names that host; so the page sends
 * its own `window.location.origin` in the request body, and Checkout and the Customer Portal
 * return people there. Anything not on the allowlist falls back to this deployment's origin.
 */
export async function publicOrigin(req: NextRequest): Promise<string> {
  const body = (await req
    .clone()
    .json()
    .catch(() => null)) as { origin?: unknown } | null;
  const claimed = typeof body?.origin === 'string' ? body.origin.trim().toLowerCase() : '';
  if (PUBLIC_ORIGINS.has(claimed)) return claimed;
  const forwarded = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase();
  const fromHeader = forwarded ? `https://${forwarded}` : '';
  if (PUBLIC_ORIGINS.has(fromHeader)) return fromHeader;
  return req.nextUrl.origin;
}
