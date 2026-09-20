import { NextResponse } from 'next/server';
import { recentActivities } from '@/lib/strava';

export const dynamic = 'force-dynamic';

// Polled by the /run page so an open tab picks up new activities without a reload.
export async function GET() {
  const activities = await recentActivities(12);
  return NextResponse.json({ activities }, { headers: { 'Cache-Control': 'no-store' } });
}
