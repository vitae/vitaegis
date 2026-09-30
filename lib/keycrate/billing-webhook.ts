import 'server-only';
import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { isPaid } from './access';

/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · Stripe webhook events → kc_access
   Only subscriptions tagged metadata.app = "keycrate" (set by /api/keycrate/checkout) are
   touched. Every event re-reads the subscription from Stripe, so events that arrive out of
   order still leave the row with the latest status.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const KEYCRATE_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === 'string' ? v : (v?.id ?? null);

/** True when the event was handled (or ignored as not KeyCrate's); throws to make Stripe retry. */
export async function handleKeyCrateEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  if (!KEYCRATE_EVENTS.has(event.type)) return false;

  let subscriptionId: string | null = null;
  let email: string | null = null;
  let userId: string | null = null;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription' || session.metadata?.app !== 'keycrate') return false;
    subscriptionId = idOf(session.subscription);
    userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
    email = session.customer_details?.email?.toLowerCase() ?? null;
  } else {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata?.app !== 'keycrate') return false;
    subscriptionId = sub.id;
    userId = sub.metadata.user_id ?? null;
  }
  if (!subscriptionId || !userId) {
    console.warn('[keycrate] webhook without subscription or user', event.id);
    return true;
  }

  const admin = supabaseAdmin();
  if (!admin) throw new Error('Supabase service role is not configured');

  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  // An old, ended subscription must not overwrite a newer paid one.
  const existing = await admin
    .from('kc_access')
    .select('subscription_id, subscription_status')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const prev = existing.data as {
    subscription_id: string | null;
    subscription_status: string | null;
  } | null;
  if (
    prev?.subscription_id &&
    prev.subscription_id !== sub.id &&
    isPaid(prev.subscription_status) &&
    !isPaid(sub.status)
  ) {
    return true;
  }

  const row: Record<string, string | null> = {
    user_id: userId,
    stripe_customer_id: idOf(sub.customer),
    subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  };
  if (email) row.email = email;
  // Upsert: a row normally exists from the first sign-in; if not, this creates it (the trial
  // start then defaults to now, which doesn't matter for a paying subscriber).
  const { error } = await admin.from('kc_access').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  return true;
}
