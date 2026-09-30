import { NextRequest, NextResponse } from 'next/server';
import { accessFor, stripe } from '@/lib/keycrate/access-server';
import { publicOrigin } from '@/lib/keycrate/public-origin';

export const dynamic = 'force-dynamic';

/** POST → { url } of the Stripe Customer Portal, to change the card or cancel. */
export async function POST(req: NextRequest) {
  try {
    const access = await accessFor(req);
    if (!access.enabled) {
      return NextResponse.json({ error: 'Subscriptions are not open yet' }, { status: 404 });
    }
    if (access.state === 'anonymous') {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
    }
    const customer = access.row?.stripe_customer_id;
    if (!customer) {
      return NextResponse.json({ error: 'No subscription to manage' }, { status: 404 });
    }
    const portal = await stripe().billingPortal.sessions.create({
      customer,
      return_url: `${publicOrigin(req)}/keycrate`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error('[keycrate] portal failed', err);
    return NextResponse.json({ error: 'Could not open the billing portal' }, { status: 500 });
  }
}
