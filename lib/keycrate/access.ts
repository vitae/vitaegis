/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · access (pure)
   24 hours free from the first Google sign-in, then $4.99/month through Stripe.
   The decision lives here so the API route and the tests share one rule.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const TRIAL_MS = 24 * 60 * 60 * 1000;
export const PRICE_LABEL = '$4.99/month';

export type AccessState = 'anonymous' | 'trial' | 'active' | 'expired';

/** Stripe subscription statuses that keep the app open. past_due gets Stripe's retry window. */
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface AccessInput {
  /** null when nobody is signed in. */
  userId: string | null;
  email?: string | null;
  trialStartedAt?: string | Date | null;
  subscriptionStatus?: string | null;
  /** Emails that are always active (KEYCRATE_FREE_EMAILS). */
  freeEmails?: readonly string[];
  now: Date | number;
}

export interface AccessDecision {
  state: AccessState;
  /** ISO time the free day ends; null for anonymous and comp accounts. */
  trialEndsAt: string | null;
}

const toMs = (d: string | Date | number) =>
  typeof d === 'number' ? d : typeof d === 'string' ? Date.parse(d) : d.getTime();

/** Comma-separated env list → trimmed, lower-cased, non-empty emails. */
export function parseEmails(list: string | undefined | null): string[] {
  return (list ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPaid(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.has(status);
}

export function decideAccess(input: AccessInput): AccessDecision {
  if (!input.userId) return { state: 'anonymous', trialEndsAt: null };
  const email = input.email?.trim().toLowerCase();
  if (email && input.freeEmails?.includes(email)) return { state: 'active', trialEndsAt: null };

  const now = toMs(input.now);
  // A row that hasn't been written yet means the trial starts now.
  const started = input.trialStartedAt ? toMs(input.trialStartedAt) : now;
  const endsMs = (Number.isFinite(started) ? started : now) + TRIAL_MS;
  const trialEndsAt = new Date(endsMs).toISOString();

  if (isPaid(input.subscriptionStatus)) return { state: 'active', trialEndsAt };
  return { state: now < endsMs ? 'trial' : 'expired', trialEndsAt };
}

/** "23h 12m left", "9m left", "less than a minute left". */
export function formatTimeLeft(trialEndsAt: string, now: Date | number): string {
  const ms = Date.parse(trialEndsAt) - toMs(now);
  if (ms <= 0) return 'Trial ended';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'less than a minute left';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
