import 'server-only';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { SECRETS_COOKIE, verifySecretsToken, type SecretsClaims } from './token';

/* ═══════════════════════════════════════════════════════════════════════════════
   Secrets · access (server)
   The paywall is live whenever STRIPE_SECRET_KEY is set. Tokens are signed with
   SECRETS_SIGNING_SECRET, or, when that is unset, with the Stripe secret key, so
   nothing else has to be configured for the page to work.
   ═══════════════════════════════════════════════════════════════════════════════ */

export function signingSecret(): string {
  return process.env.SECRETS_SIGNING_SECRET?.trim() || process.env.STRIPE_SECRET_KEY || '';
}

export function checkoutEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let stripeClient: Stripe | null = null;
/** Same API version as the site's other Stripe routes. */
export function stripe(): Stripe {
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  return stripeClient;
}

/** The paid visitor's claims from the request cookie, or null. */
export async function secretsAccess(): Promise<SecretsClaims | null> {
  const jar = await cookies();
  return verifySecretsToken(jar.get(SECRETS_COOKIE)?.value, signingSecret());
}
