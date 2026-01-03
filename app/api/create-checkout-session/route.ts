import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const { quantity } = await req.json();
    const ticketQuantity = Math.max(1, Math.min(quantity || 1, 10));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: 'prod_TipeQSvjJhKRuz', // This should be a price ID, not a product ID
          quantity: ticketQuantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        event: 'Meditation Mondays',
        tickets: String(ticketQuantity),
      },
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
