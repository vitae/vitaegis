import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  summarize,
  summarizeBacktest,
  type KalshirustConfig,
  type KalshirustEvent,
} from '@/lib/kalshirust';

export const dynamic = 'force-dynamic';

const MISSING = 'kalshirust tables missing: run supabase/migrations/20261101130000_kalshirust.sql';

/** Everything /kalshirust shows: the bot's mode, newest heartbeat, trades, errors and the backtest. Public. */
export async function GET() {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const newest = () =>
    db.from('kalshirust_events').select('*').order('created_at', { ascending: false }).limit(400);
  const [config, events, btSettles, btSignals] = await Promise.all([
    db.from('kalshirust_config').select('*').eq('id', 1).maybeSingle(),
    newest().neq('source', 'backtest'),
    newest().eq('source', 'backtest').eq('kind', 'settle'),
    newest().eq('source', 'backtest').eq('kind', 'signal'),
  ]);
  const failed = [config, events, btSettles, btSignals].find((r) => r.error)?.error;
  if (failed) {
    const missing = failed.code === '42P01' || /kalshirust/.test(failed.message);
    return NextResponse.json({ error: missing ? MISSING : failed.message }, { status: 500 });
  }

  const cfg = (config.data ?? null) as KalshirustConfig | null;
  return NextResponse.json(
    {
      config: { mode: cfg?.mode ?? 'NORMAL', updatedAt: cfg?.updated_at ?? null },
      ...summarize((events.data ?? []) as KalshirustEvent[]),
      backtest: summarizeBacktest(
        (btSignals.data ?? []) as KalshirustEvent[],
        (btSettles.data ?? []) as KalshirustEvent[],
      ),
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
