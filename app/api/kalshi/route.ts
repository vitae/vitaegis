import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { publicSummary, type KalshiEvent } from '@/lib/kalshi';

export const dynamic = 'force-dynamic';

/** Everything /kalshi shows: the market being watched, every trade, settled markets, and
 *  the threshold backtest. Public, and it never includes the account balance. Live
 *  updates arrive over Realtime; this is the snapshot the page starts from. */
export async function GET() {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const rows = (kind: string, limit: number) =>
    db
      .from('kalshi_events')
      .select('*')
      .eq('kind', kind)
      .order('created_at', { ascending: false })
      .limit(limit);

  const [newest, ticks, orders, settles, errors] = await Promise.all([
    db.from('kalshi_events').select('*').order('created_at', { ascending: false }).limit(1),
    rows('tick', 400),
    rows('order', 300),
    rows('settle', 300),
    rows('error', 10),
  ]);
  const failed = [newest, ticks, orders, settles, errors].find((r) => r.error);
  if (failed?.error) {
    const missing = failed.error.code === '42P01';
    return NextResponse.json(
      {
        error: missing
          ? 'kalshi_events table missing: run supabase/migrations/20261031120000_kalshi_events.sql'
          : failed.error.message,
      },
      { status: 500 },
    );
  }

  const ev = (r: { data: unknown }) => (r.data ?? []) as KalshiEvent[];
  return NextResponse.json(
    publicSummary({
      newest: ev(newest)[0] ?? null,
      ticks: ev(ticks),
      orders: ev(orders),
      settles: ev(settles),
      errors: ev(errors),
    }),
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
