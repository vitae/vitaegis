import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { adminAuthed } from '@/lib/admin-auth';
import { summarize, type KalshiEvent } from '@/lib/kalshi';

export const dynamic = 'force-dynamic';

/** Newest Kalshi bot telemetry, reduced to what /admin/kalshi shows. */
export async function GET(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { data, error } = await db
    .from('kalshi_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) {
    const missing = error.code === '42P01';
    return NextResponse.json(
      {
        error: missing
          ? 'kalshi_events table missing: run supabase/migrations/20261031120000_kalshi_events.sql'
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...summarize((data ?? []) as KalshiEvent[]),
    generatedAt: new Date().toISOString(),
  });
}
