import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_FLAG_COOKIE,
  ACCESS_MAX_AGE,
  PROJECTS_UNLOCK_PATH,
  accessCookie,
  accessSecret,
  namedProject,
  signAccess,
} from '@/lib/projects-access';

export const dynamic = 'force-dynamic';

/**
 * Stripe sends the buyer here after Checkout. If Stripe confirms the session is a paid
 * purchase of one project, set that project's access cookie and open the project.
 */
export async function GET(req: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin));
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? '';
  const secret = accessSecret();
  try {
    if (!secret || !process.env.STRIPE_SECRET_KEY || !sessionId.startsWith('cs_')) {
      return back(PROJECTS_UNLOCK_PATH);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const project = namedProject(session.metadata?.project);
    if (session.metadata?.app !== 'projects' || !project || session.payment_status !== 'paid') {
      return back(PROJECTS_UNLOCK_PATH);
    }
    const res = back(project);
    const base = { path: '/', maxAge: ACCESS_MAX_AGE, sameSite: 'lax' as const, secure: true };
    res.cookies.set(accessCookie(project), await signAccess(project, session.id, secret), {
      ...base,
      httpOnly: true,
    });
    const owned = new Set((req.cookies.get(ACCESS_FLAG_COOKIE)?.value ?? '').split('.'));
    owned.add(project.slice(1));
    res.cookies.set(ACCESS_FLAG_COOKIE, [...owned].filter(Boolean).join('.'), base);
    return res;
  } catch (err) {
    console.error('[projects] unlock failed', err instanceof Error ? err.message : err);
    return back(PROJECTS_UNLOCK_PATH);
  }
}
