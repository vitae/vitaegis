import { NextRequest, NextResponse } from 'next/server';
import { accessFor } from '@/lib/keycrate/access-server';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET → { enabled, state, trialEndsAt, canManage } for the signed-in user
 * (Authorization: Bearer <Supabase access token>, or the Supabase session cookie).
 * enabled:false means the paywall is off (no price or Supabase env) and the app is open to all.
 */
export async function GET(req: NextRequest) {
  try {
    const access = await accessFor(req);
    if (!access.enabled) {
      return NextResponse.json(
        { enabled: false, state: 'active', trialEndsAt: null, canManage: false },
        { headers: noStore },
      );
    }
    return NextResponse.json(
      {
        enabled: true,
        state: access.state,
        trialEndsAt: access.trialEndsAt,
        canManage: !!access.row?.stripe_customer_id,
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error('[keycrate] access check failed', err);
    return NextResponse.json(
      { enabled: true, error: 'Could not check your access' },
      { status: 503, headers: noStore },
    );
  }
}
