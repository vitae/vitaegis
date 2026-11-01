'use client';

// The feeds behind the /kalshi HUD: the Rust bot's market_windows and trade_executions over
// Supabase Realtime (snapshot once, then every insert and update), and /api/bot-status
// polled for the VPS.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { BotStatus, MarketWindow, TradeExecution } from '@/lib/kalshi-hud';

export interface HudRows {
  windows: MarketWindow[];
  executions: TradeExecution[];
}

export type RealtimeState = 'unconfigured' | 'connecting' | 'connected' | 'error';

const LIMITS = { windows: 48, executions: 500 };

function upsert<T extends { id: number }>(
  rows: T[],
  row: T,
  key: (r: T) => string,
  limit: number,
): T[] {
  return [row, ...rows.filter((r) => r.id !== row.id)]
    .sort((a, b) => key(b).localeCompare(key(a)))
    .slice(0, limit);
}

/** Snapshot plus live changes for market_windows and trade_executions, newest first. */
export function useHudRows(): HudRows & {
  realtime: RealtimeState;
  error: string;
  reload: () => Promise<void>;
} {
  const [rows, setRows] = useState<HudRows>({ windows: [], executions: [] });
  const [realtime, setRealtime] = useState<RealtimeState>('connecting');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const sb = supabaseBrowser();
    if (!sb) {
      setRealtime('unconfigured');
      setError('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).');
      return;
    }
    const [w, x] = await Promise.all([
      sb
        .from('market_windows')
        .select('*')
        .order('close_time', { ascending: false })
        .limit(LIMITS.windows),
      sb
        .from('trade_executions')
        .select('*')
        .order('executed_at', { ascending: false, nullsFirst: false })
        .limit(LIMITS.executions),
    ]);
    const failed = [w, x].find((r) => r.error);
    if (failed?.error) {
      const missing =
        failed.error.code === '42P01' || /does not exist|schema cache/.test(failed.error.message);
      setError(
        missing
          ? 'Bot tables missing: run supabase/migrations/20261101120000_kalshi_hud.sql.'
          : failed.error.message,
      );
      return;
    }
    setError('');
    setRows({
      windows: (w.data ?? []) as MarketWindow[],
      executions: (x.data ?? []) as TradeExecution[],
    });
  }, []);

  useEffect(() => {
    void reload();
    const sb = supabaseBrowser();
    if (!sb) return;
    const channel = sb
      .channel('kalshi-hud')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_windows' },
        ({ new: row }) =>
          row &&
          'id' in row &&
          setRows((r) => ({
            ...r,
            windows: upsert(r.windows, row as MarketWindow, (w) => w.close_time, LIMITS.windows),
          })),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_executions' },
        ({ new: row }) =>
          row &&
          'id' in row &&
          setRows((r) => ({
            ...r,
            executions: upsert(
              r.executions,
              row as TradeExecution,
              (x) => x.executed_at ?? '',
              LIMITS.executions,
            ),
          })),
      )
      .subscribe((status) =>
        setRealtime(
          status === 'SUBSCRIBED'
            ? 'connected'
            : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
              ? 'error'
              : 'connecting',
        ),
      );
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void sb.removeChannel(channel);
    };
  }, [reload]);

  return { ...rows, realtime, error, reload };
}

/** Polls /api/bot-status for the VPS, the Kalshi WebSocket, the window's strike and logs. */
export function useBotStatus(intervalMs = 15_000): {
  status: BotStatus | null;
  error: string;
  fetchedAt: number | null;
} {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const inflight = useRef(false);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (inflight.current || document.visibilityState !== 'visible') return;
      inflight.current = true;
      try {
        const res = await fetch('/api/bot-status', { cache: 'no-store' });
        const body = (await res.json()) as BotStatus & { error?: string };
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!stopped) {
          setStatus(body);
          setFetchedAt(Date.now());
          setError('');
        }
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : 'bot-status unreachable');
      } finally {
        inflight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && void poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return { status, error, fetchedAt };
}
