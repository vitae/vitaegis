import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const { quantity } = await req.json();

    // Safety check
    const ticketQuantity = Math.max(1, Math.min(quantity || 1, 10));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: ticketQuantity * 100, // $1 per ticket
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
  } catch (err: any) {
    console.error('Stripe error:', err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
