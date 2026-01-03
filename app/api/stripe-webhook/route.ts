import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe secret key and webhook secret from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const config = {
  api: {
    bodyParser: false, // Stripe requires the raw body
  },
};

// Helper to buffer the raw request body
async function buffer(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader();
  let chunks = [];
  let done, value;
  while (!done) {
    ({ done, value } = await reader.read());
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const rawBody = await buffer(req.body!);
    const sig = req.headers.get('stripe-signature')!;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent failed.', paymentIntent.id);
      break;
    }
    // Add more event types as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
