import type { NextRequest } from 'next/server';

/** Hosts allowed to serve KeyCrate, so a forged header can't send Stripe back to a stranger's site. */
const PUBLIC_HOSTS = new Set([
  'www.vitaegis.com',
  'vitaegis.com',
  'www.glowwitdaflow.com',
  'glowwitdaflow.com',
  'localhost:3000',
]);

/**
 * The origin the visitor is actually on. KeyCrate is proxied from glowwitdaflow.com/keycrate
 * by a rewrite, which arrives here with the proxy's host in X-Forwarded-Host; Checkout and the
 * Customer Portal must return people to that host, not to the deployment behind it.
 */
export function publicOrigin(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase();
  if (forwarded && PUBLIC_HOSTS.has(forwarded)) {
    const proto = forwarded.startsWith('localhost') ? 'http' : 'https';
    return `${proto}://${forwarded}`;
  }
  return req.nextUrl.origin;
}
