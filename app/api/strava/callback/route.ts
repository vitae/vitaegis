import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { backfill, exchangeCode, removeAthlete } from '@/lib/strava';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const base = process.env.NEXT_PUBLIC_BASE_URL || origin;
  if (searchParams.get('error')) return NextResponse.redirect(`${base}/run?strava=denied`);
  const code = searchParams.get('code');
  const scope = searchParams.get('scope') ?? '';
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  if (!scope.includes('activity:read')) return NextResponse.redirect(`${base}/run?strava=scope`);

  try {
    const athleteId = await exchangeCode(code);

    // Single-athlete site: refuse a second account unless STRAVA_ATHLETE_ID allows it.
    const allowed = process.env.STRAVA_ATHLETE_ID;
    if (allowed && String(athleteId) !== allowed) {
      await removeAthlete(athleteId);
      return NextResponse.redirect(`${base}/run?strava=wrong-account`);
    }
    const db = supabaseAdmin();
    if (db && !allowed) {
      const { data } = await db.from('strava_tokens').select('athlete_id');
      if (data && data.length > 1) {
        await removeAthlete(athleteId);
        return NextResponse.redirect(`${base}/run?strava=already-connected`);
      }
    }

    await backfill(athleteId);
    revalidatePath('/run');
    return NextResponse.redirect(`${base}/run?strava=connected#live`);
  } catch (err) {
    console.error('Strava callback failed:', err);
    return NextResponse.redirect(`${base}/run?strava=error`);
  }
}
