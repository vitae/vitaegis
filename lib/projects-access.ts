/* ═══════════════════════════════════════════════════════════════════════════════
   Projects paywall
   Each page in LOCKED_PROJECTS is bought on its own. Access is a signed cookie per project,
   set after Stripe confirms the Checkout session was paid: no account, it lives in the
   browser that paid. The paywall is OFF (pages open to everyone) unless a signing secret is
   available. Web Crypto only, so the same code runs in the request proxy and route handlers.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const LOCKED_PROJECTS = ['/travel', '/stocks', '/vitamins'];
export const PROJECTS_PRICE_CENTS = 999;
export const PROJECTS_PRICE_LABEL = '$9.99';
export const PROJECTS_UNLOCK_PATH = '/projects/unlock';

/** The signed proof of payment for one project, e.g. vg_project_travel. httpOnly. */
export const accessCookie = (project: string) => `vg_project_${project.slice(1)}`;
/** Readable by the page, only so buttons can say "Unlocked": slugs joined by dots. Grants nothing. */
export const ACCESS_FLAG_COOKIE = 'vg_projects_ok';
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export function accessSecret(): string | null {
  return process.env.PROJECTS_ACCESS_SECRET?.trim() || process.env.STRIPE_SECRET_KEY || null;
}

/** The locked project a path belongs to, or null. */
export function lockedProject(pathname: string): string | null {
  const path = pathname.toLowerCase();
  return LOCKED_PROJECTS.find((p) => path === p || path.startsWith(`${p}/`)) ?? null;
}

/** The locked project named by a `next` or `project` value, or null if it is not one. */
export function namedProject(value: unknown): string | null {
  return typeof value === 'string' && LOCKED_PROJECTS.includes(value) ? value : null;
}

async function sign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`vg-projects:${message}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cookie value for a paid Checkout session of one project. */
export async function signAccess(
  project: string,
  sessionId: string,
  secret: string,
): Promise<string> {
  return `${sessionId}.${await sign(`${project}:${sessionId}`, secret)}`;
}

export async function verifyAccess(
  token: string | undefined,
  project: string,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const expected = await sign(`${project}:${token.slice(0, dot)}`, secret);
  const given = token.slice(dot + 1);
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
