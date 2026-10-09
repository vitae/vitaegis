import { NextRequest, NextResponse } from 'next/server';
import { checkoutEnabled, signingSecret, stripe } from '@/lib/secrets/access-server';
import { SECRETS_COOKIE, SECRETS_TTL_SECONDS, signSecretsToken } from '@/lib/secrets/token';

export const dynamic = 'force-dynamic';

/**
 * Stripe sends the buyer here after Checkout. The session is read back from Stripe, never
 * trusted from the URL: only a paid session tagged for /secrets sets the access cookie.
 */
export async function GET(req: NextRequest) {
  const back = (ok: boolean) => {
    const url = req.nextUrl.clone();
    url.pathname = '/secrets';
    url.search = ok ? '?unlocked=1' : '?error=1';
    return NextResponse.redirect(url);
  };

  const sessionId = req.nextUrl.searchParams.get('session_id') ?? '';
  if (!checkoutEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return back(false);

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (
      session.mode !== 'payment' ||
      session.payment_status !== 'paid' ||
      session.metadata?.app !== 'secrets'
    ) {
      return back(false);
    }
    const exp = Math.floor(Date.now() / 1000) + SECRETS_TTL_SECONDS;
    const token = signSecretsToken({ sid: session.id, exp }, signingSecret());
    const res = back(true);
    res.cookies.set(SECRETS_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      path: '/secrets',
      maxAge: SECRETS_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    console.error('[secrets] unlock failed', err);
    return back(false);
  }
}
