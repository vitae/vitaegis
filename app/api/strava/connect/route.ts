import { NextRequest, NextResponse } from 'next/server';
import { authorizeUrl, stravaConfigured } from '@/lib/strava';

// One-time: the site owner opens /api/strava/connect?key=STRAVA_CONNECT_KEY to link their Strava account.
export async function GET(req: NextRequest) {
  if (!stravaConfigured())
    return NextResponse.json({ error: 'Strava is not configured' }, { status: 503 });
  const key = process.env.STRAVA_CONNECT_KEY;
  if (key && req.nextUrl.searchParams.get('key') !== key) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const origin = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  return NextResponse.redirect(authorizeUrl(`${origin}/api/strava/callback`));
}
