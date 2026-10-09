import { NextRequest, NextResponse } from 'next/server';
import { checkoutEnabled, stripe } from '@/lib/secrets/access-server';
import { SECRETS_PRICE_CENTS } from '@/lib/secrets/token';
import { publicOrigin } from '@/lib/keycrate/public-origin';

export const dynamic = 'force-dynamic';

/** POST → { url } of a Stripe Checkout Session for one-time access to /secrets. */
export async function POST(req: NextRequest) {
  try {
    if (!checkoutEnabled()) {
      return NextResponse.json({ error: 'Checkout is not open yet' }, { status: 503 });
    }
    const origin = await publicOrigin(req);
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: SECRETS_PRICE_CENTS,
            product_data: {
              name: 'Vitaegis Secrets',
              description: 'One year of access to vitaegis.com/secrets.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: { app: 'secrets' },
      allow_promotion_codes: true,
      success_url: `${origin}/secrets/unlock?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/secrets`,
    });
    if (!session.url) throw new Error('Stripe returned no Checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[secrets] checkout failed', err);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
