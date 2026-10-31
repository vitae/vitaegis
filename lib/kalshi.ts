// Shared shape and summary logic for the Kalshi bot dashboard. The bot (scripts/kalshi_bot.py)
// writes kalshi_events; /api/admin/kalshi reduces the newest rows with summarize().

export type KalshiEventKind = 'tick' | 'order' | 'error' | 'status';

export interface KalshiEvent {
  id: string;
  created_at: string;
  kind: KalshiEventKind;
  live: boolean;
  ticker: string | null;
  close_time: string | null;
  yes_ask_cents: number | null;
  no_ask_cents: number | null;
  outcome: 'yes' | 'no' | null;
  price_cents: number | null;
  count: number | null;
  order_id: string | null;
  fill_count: number | null;
  remaining_count: number | null;
  avg_fill_cents: number | null;
  balance_cents: number | null;
  message: string | null;
}

export interface KalshiMarket {
  ticker: string;
  closeTime: string | null;
  yesAsk: number | null;
  noAsk: number | null;
  entry: { outcome: 'yes' | 'no'; priceCents: number } | null;
}

export interface KalshiSummary {
  lastSeen: string | null;
  online: boolean;
  live: boolean | null;
  balanceCents: number | null;
  market: KalshiMarket | null;
  orders24h: number;
  orders: KalshiEvent[];
  errors: KalshiEvent[];
  ticks: KalshiEvent[];
}

/** The bot polls every 15s and heartbeats at least once a minute; past this it is offline. */
export const STALE_MS = 90_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Mirrors find_entry in scripts/kalshi_bot.py: the cheap side when the other is heavy. */
export function entryZone(
  yesAsk: number | null,
  noAsk: number | null,
  minCents = 8,
  maxCents = 28,
): { outcome: 'yes' | 'no'; priceCents: number } | null {
  if (yesAsk == null || noAsk == null) return null;
  const heavy = 100 - maxCents;
  if (yesAsk >= heavy && noAsk >= minCents && noAsk <= maxCents) {
    return { outcome: 'no', priceCents: noAsk };
  }
  if (noAsk >= heavy && yesAsk >= minCents && yesAsk <= maxCents) {
    return { outcome: 'yes', priceCents: yesAsk };
  }
  return null;
}

/** Reduce events (newest first) to what the dashboard shows. */
export function summarize(events: KalshiEvent[], now = Date.now()): KalshiSummary {
  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const newest = sorted[0] ?? null;
  const lastSeen = newest?.created_at ?? null;
  const online = lastSeen != null && now - Date.parse(lastSeen) < STALE_MS;

  const tick = sorted.find((e) => e.kind === 'tick' && e.ticker);
  const market: KalshiMarket | null = tick
    ? {
        ticker: tick.ticker as string,
        closeTime: tick.close_time,
        yesAsk: tick.yes_ask_cents,
        noAsk: tick.no_ask_cents,
        entry: entryZone(tick.yes_ask_cents, tick.no_ask_cents),
      }
    : null;

  const orders = sorted.filter((e) => e.kind === 'order');
  const since = now - DAY_MS;

  return {
    lastSeen,
    online,
    live: newest ? newest.live : null,
    balanceCents: sorted.find((e) => e.balance_cents != null)?.balance_cents ?? null,
    market,
    orders24h: orders.filter((e) => Date.parse(e.created_at) >= since).length,
    orders: orders.slice(0, 50),
    errors: sorted.filter((e) => e.kind === 'error').slice(0, 20),
    ticks: sorted.filter((e) => e.kind === 'tick').slice(0, 40),
  };
}

export const dollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;
