import { createHmac, timingSafeEqual } from 'node:crypto';

/* ═══════════════════════════════════════════════════════════════════════════════
   Secrets · access token
   A paid visitor to /secrets carries a signed, HttpOnly cookie. The token is the
   Stripe Checkout session that paid, an expiry, and an HMAC over both, so the page
   can grant access without a database or a sign-in. Pure functions; tested.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const SECRETS_COOKIE = 'vitaegis_secrets';
export const SECRETS_PRICE_CENTS = 999;
export const SECRETS_PRICE_LABEL = '$9.99';
/** One year of access per purchase. */
export const SECRETS_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface SecretsClaims {
  /** Stripe Checkout session id that paid. */
  sid: string;
  /** Unix seconds after which the token is no longer accepted. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

/** `base64url(json).signature` */
export function signSecretsToken(claims: SecretsClaims, secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(claims), 'utf8'));
  return `${payload}.${sign(payload, secret)}`;
}

/** The claims when the token is well-formed, correctly signed and not expired; otherwise null. */
export function verifySecretsToken(
  token: string | undefined | null,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): SecretsClaims | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!claims || typeof claims !== 'object') return null;
  const { sid, exp } = claims as Record<string, unknown>;
  if (typeof sid !== 'string' || !sid || typeof exp !== 'number' || !Number.isFinite(exp)) {
    return null;
  }
  if (exp <= now) return null;
  return { sid, exp };
}
