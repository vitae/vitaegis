import { NextRequest, NextResponse } from 'next/server';
import { accessFor, stripe } from '@/lib/keycrate/access-server';
import { publicOrigin } from '@/lib/keycrate/public-origin';

export const dynamic = 'force-dynamic';

/** POST → { url } of a Stripe Checkout Session for the $3.33/month KeyCrate subscription. */
export async function POST(req: NextRequest) {
  try {
    const access = await accessFor(req);
    if (!access.enabled) {
      return NextResponse.json({ error: 'Subscriptions are not open yet' }, { status: 404 });
    }
    if (access.state === 'anonymous') {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
    }
    if (access.state === 'active' || !access.row) {
      return NextResponse.json({ error: 'Your account is already active' }, { status: 409 });
    }
    const row = access.row;
    const origin = await publicOrigin(req);
    // Tags both the session and the subscription so the webhook only touches KeyCrate's own.
    const metadata = { app: 'keycrate', user_id: row.user_id };
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.KEYCRATE_STRIPE_PRICE_ID!.trim(), quantity: 1 }],
      ...(row.stripe_customer_id
        ? { customer: row.stripe_customer_id }
        : access.email
          ? { customer_email: access.email }
          : {}),
      client_reference_id: row.user_id,
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/keycrate?subscribed=1`,
      cancel_url: `${origin}/keycrate`,
    });
    if (!session.url) throw new Error('Stripe returned no Checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[keycrate] checkout failed', err);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
