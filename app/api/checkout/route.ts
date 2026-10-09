import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin } from '@/lib/keycrate/public-origin';
import { getStoreProduct } from '@/lib/store';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST { id, origin } → { url } of a Stripe Checkout Session for one store product.
 * Prices come from the catalog in lib/store.ts, never from the request. A body with no
 * id keeps the original behaviour (the $10 yoga ticket) for the older ticket button.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req
      .clone()
      .json()
      .catch(() => ({}))) as { id?: unknown };
    const product = getStoreProduct(body.id);
    if (body.id !== undefined && !product) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 404 });
    }
    const origin = await publicOrigin(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        product
          ? {
              price_data: {
                currency: 'usd',
                unit_amount: product.priceCents,
                product_data: {
                  name: product.name,
                  description: product.description,
                  images: [`${origin}${product.image}`],
                },
              },
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'usd',
                product_data: { name: 'Yoga Ticket' },
                unit_amount: 1000,
              },
              quantity: 1,
            },
      ],
      ...(product ? { metadata: { app: 'store', product: product.id } } : {}),
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
    });

    if (!session.url) throw new Error('Stripe returned no Checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[store] checkout failed', err);
    return NextResponse.json({ error: 'Stripe checkout session failed' }, { status: 500 });
  }
}
