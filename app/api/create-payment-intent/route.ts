import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { quantity?: unknown };
    const requested = Number(body.quantity);
    const ticketQuantity = Number.isInteger(requested) ? Math.max(1, Math.min(requested, 10)) : 1;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: ticketQuantity * 900, // $9 per ticket
      currency: 'usd',

      // THIS ENABLES:
      // Apple Pay, Google Pay, Link, cards, etc.
      automatic_payment_methods: {
        enabled: true,
      },

      // Optional but recommended
      description: `Meditation Mondays — ${ticketQuantity} ticket(s)`,

      metadata: {
        event: 'Meditation Mondays',
        tickets: String(ticketQuantity),
        product_id: 'prod_TipeQSvjJhKRuz',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: 'Could not start the payment. Try again.' }, { status: 500 });
  }
}
