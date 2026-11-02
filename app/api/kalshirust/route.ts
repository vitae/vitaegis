import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  summarize,
  summarizeBacktest,
  WINDOWS_PER_DAY,
  type KalshirustConfig,
  type KalshirustEvent,
} from '@/lib/kalshirust';

export const dynamic = 'force-dynamic';

const MISSING = 'kalshirust tables missing: run supabase/migrations/20261101130000_kalshirust.sql';

/** Everything /kalshirust shows: the bot's mode, newest heartbeat, closed windows, trades, errors and the backtest. Public. */
export async function GET() {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const newest = (limit = 400) =>
    db.from('kalshirust_events').select('*').order('created_at', { ascending: false }).limit(limit);
  const [config, events, closes, tradeRows, btSettles, btSignals] = await Promise.all([
    db.from('kalshirust_config').select('*').eq('id', 1).maybeSingle(),
    newest().neq('source', 'backtest'),
    newest(WINDOWS_PER_DAY)
      .eq('kind', 'status')
      .eq('source', 'bot')
      .eq('seconds_to_close', 0)
      .like('message', 'settled %'),
    newest().in('kind', ['signal', 'settle']).neq('source', 'backtest'),
    newest().eq('source', 'backtest').eq('kind', 'settle'),
    newest().eq('source', 'backtest').eq('kind', 'signal'),
  ]);
  const failed = [config, events, closes, tradeRows, btSettles, btSignals].find(
    (r) => r.error,
  )?.error;
  if (failed) {
    const missing = failed.code === '42P01' || /kalshirust/.test(failed.message);
    return NextResponse.json({ error: missing ? MISSING : failed.message }, { status: 500 });
  }

  const cfg = (config.data ?? null) as KalshirustConfig | null;
  const live = new Map<string, KalshirustEvent>();
  const rows = [...(events.data ?? []), ...(closes.data ?? []), ...(tradeRows.data ?? [])];
  for (const e of rows as KalshirustEvent[]) live.set(e.id, e);
  return NextResponse.json(
    {
      config: {
        mode: cfg?.mode ?? 'NORMAL',
        updatedAt: cfg?.updated_at ?? null,
        desiredState: cfg?.desired_state ?? 'stopped',
        commandAt: cfg?.command_at ?? null,
        hostName: cfg?.host_name ?? null,
        hostStatus: cfg?.host_status ?? null,
        hostSeenAt: cfg?.host_seen_at ?? null,
        botStartedAt: cfg?.bot_started_at ?? null,
      },
      ...summarize([...live.values()]),
      backtest: summarizeBacktest(
        (btSignals.data ?? []) as KalshirustEvent[],
        (btSettles.data ?? []) as KalshirustEvent[],
      ),
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
