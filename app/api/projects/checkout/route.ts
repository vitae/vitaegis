import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { projects } from '@/components/projects';
import { publicOrigin } from '@/lib/keycrate/public-origin';
import { PROJECTS_PRICE_CENTS, PROJECTS_UNLOCK_PATH, namedProject } from '@/lib/projects-access';

export const dynamic = 'force-dynamic';

/** POST { project, origin } → { url } of a Stripe Checkout Session that unlocks one project. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req
      .clone()
      .json()
      .catch(() => ({}))) as { project?: unknown };
    const href = namedProject(body.project);
    const project = projects.find((p) => p.href === href);
    if (!href || !project) return NextResponse.json({ error: 'Unknown project' }, { status: 404 });
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    const origin = await publicOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: PROJECTS_PRICE_CENTS,
            product_data: {
              name: `VITAEGIS ${project.title}`,
              description: project.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { app: 'projects', project: href },
      success_url: `${origin}/api/projects/unlock?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${PROJECTS_UNLOCK_PATH}?next=${encodeURIComponent(href)}`,
    });

    if (!session.url) throw new Error('Stripe returned no Checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[projects] checkout failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
