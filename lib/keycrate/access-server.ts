import 'server-only';
import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { decideAccess, parseEmails, type AccessDecision } from './access';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · access (server)
   The paywall is OFF unless KEYCRATE_STRIPE_PRICE_ID, STRIPE_SECRET_KEY and the Supabase
   env (URL, anon key, service role key) are all set. Off means every visitor gets the app
   exactly as before. Rows in kc_access are written only here and by the Stripe webhook,
   with the service role.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface AccessRow {
  user_id: string;
  email: string | null;
  trial_started_at: string;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export const ACCESS_COLUMNS =
  'user_id, email, trial_started_at, stripe_customer_id, subscription_id, subscription_status, current_period_end';

export function paywallEnabled(): boolean {
  return !!(
    process.env.KEYCRATE_STRIPE_PRICE_ID?.trim() &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const freeEmails = () => parseEmails(process.env.KEYCRATE_FREE_EMAILS);

let stripeClient: Stripe | null = null;
/** Same API version as the site's Stripe webhook. */
export function stripe(): Stripe {
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  return stripeClient;
}

/**
 * The signed-in Supabase user: the `Authorization: Bearer <access token>` header first,
 * then the session cookie that the @supabase/ssr browser client keeps. Verified by Supabase
 * (getUser), never trusted from the token alone.
 */
export async function requestUser(req: NextRequest): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(bearer);
    return data.user ?? null;
  }
  const sb = createServerClient(url, key, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
  });
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/** The user's row, created on first sight: that insert starts the free day. */
export async function ensureAccessRow(admin: SupabaseClient, user: User): Promise<AccessRow> {
  const ins = await admin
    .from('kc_access')
    .upsert(
      { user_id: user.id, email: user.email?.toLowerCase() ?? null },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  if (ins.error) throw new Error(ins.error.message);
  const { data, error } = await admin
    .from('kc_access')
    .select(ACCESS_COLUMNS)
    .eq('user_id', user.id)
    .single();
  if (error) throw new Error(error.message);
  return data as AccessRow;
}

export type AccessResult =
  | { enabled: false }
  | ({ enabled: true; email: string | null; row: AccessRow | null } & AccessDecision);

/** The whole decision for one request. Throws when the database can't be read. */
export async function accessFor(req: NextRequest): Promise<AccessResult> {
  if (!paywallEnabled()) return { enabled: false };
  const user = await requestUser(req);
  if (!user)
    return { enabled: true, email: null, row: null, state: 'anonymous', trialEndsAt: null };
  const email = user.email?.toLowerCase() ?? null;
  const admin = supabaseAdmin();
  if (!admin) throw new Error('Supabase service role is not configured');
  const free = freeEmails();
  // Comp accounts skip the database entirely, so the owner gets in even before the migration.
  if (email && free.includes(email)) {
    return { enabled: true, email, row: null, state: 'active', trialEndsAt: null };
  }
  const row = await ensureAccessRow(admin, user);
  const decision = decideAccess({
    userId: user.id,
    email,
    trialStartedAt: row.trial_started_at,
    subscriptionStatus: row.subscription_status,
    freeEmails: free,
    now: Date.now(),
  });
  return { enabled: true, email, row, ...decision };
}
