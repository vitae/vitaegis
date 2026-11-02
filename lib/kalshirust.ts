// KALSHIRUST: pure reducers over the Rust bot's telemetry (kalshirust_events) for /kalshirust.

export type RustMode = 'NORMAL' | 'RISK';
export type RustSide = 'yes' | 'no';
export type RustSource = 'bot' | 'sniper';
export type StrikeType = 'greater' | 'less' | 'between' | 'greater_or_equal';

export interface KalshirustConfig {
  id: number;
  mode: RustMode;
  updated_at: string;
}

export interface KalshirustEvent {
  id: string;
  created_at: string;
  kind: 'status' | 'signal' | 'settle' | 'error' | 'watch';
  source: RustSource;
  mode: string | null;
  live: boolean;
  ticker: string | null;
  title: string | null;
  subtitle: string | null;
  close_time: string | null;
  seconds_to_close: number | null;
  spot: number | null;
  strike: number | null;
  cap_strike: number | null;
  strike_type: StrikeType | null;
  vol_window: number | null;
  yes_bid_cents: number | null;
  yes_ask_cents: number | null;
  no_ask_cents: number | null;
  model_prob: number | null;
  edge_cents: number | null;
  side: RustSide | null;
  price_cents: number | null;
  count: number | null;
  cost_cents: number | null;
  fee_cents: number | null;
  client_order_id: string | null;
  order_id: string | null;
  result: RustSide | null;
  pnl_cents: number | null;
  message: string | null;
}

export interface Trade {
  id: string;
  at: string;
  ticker: string | null;
  source: RustSource;
  mode: string | null;
  live: boolean;
  side: RustSide | null;
  priceCents: number | null;
  count: number | null;
  costCents: number | null;
  feeCents: number | null;
  modelProb: number | null;
  edgeCents: number | null;
  result: RustSide | null;
  pnlCents: number | null;
  settledAt: string | null;
}

export interface Totals {
  trades: number;
  settled: number;
  wins: number;
  losses: number;
  hitRate: number | null;
  riskedCents: number;
  pnlCents: number;
  roi: number | null;
}

export interface WatchRow {
  ticker: string;
  title: string | null;
  subtitle: string | null;
  closeTime: string | null;
  secondsToClose: number | null;
  strikeType: StrikeType | null;
  strike: number | null;
  capStrike: number | null;
  spot: number | null;
  yesAskCents: number | null;
  noAskCents: number | null;
  modelProb: number | null;
  side: RustSide | null;
  priceCents: number | null;
  edgeCents: number | null;
  at: string;
}

export interface HistoryPoint {
  t: number;
  modelProb: number | null;
  yesAskCents: number | null;
  spot: number | null;
  strike: number | null;
  secondsToClose: number | null;
}

export interface Summary {
  status: KalshirustEvent | null;
  online: boolean;
  trades: Trade[];
  totals: Totals & { bySource: Record<RustSource, Totals> };
  watchlist: WatchRow[];
  history: HistoryPoint[];
  errors: { at: string; message: string }[];
}

export const OFFLINE_AFTER_MS = 90_000;
export const HISTORY_POINTS = 120;
export const WATCH_WINDOW_MS = 10 * 60_000;
export const WATCH_LIMIT = 15;

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const dollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

export const signedDollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `${cents < 0 ? '−' : '+'}$${(Math.abs(cents) / 100).toFixed(2)}`;

export function kalshiFeeCents(count: number, priceCents: number): number {
  const p = priceCents / 100;
  return Math.ceil(7 * count * p * (1 - p) - 1e-9);
}

/** Reduces events (any order) to what /kalshirust shows. `now` is injectable for tests. */
export function summarize(events: KalshirustEvent[], now = Date.now()): Summary {
  const byTime = [...events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const statuses = byTime.filter((e) => e.kind === 'status');
  const status = statuses[statuses.length - 1] ?? null;
  const online = status != null && now - Date.parse(status.created_at) < OFFLINE_AFTER_MS;

  const settles = new Map<string, KalshirustEvent>();
  for (const e of byTime) {
    if (e.kind === 'settle' && e.client_order_id) settles.set(e.client_order_id, e);
  }
  const trades: Trade[] = byTime
    .filter((e) => e.kind === 'signal')
    .map((e) => {
      const s = e.client_order_id ? settles.get(e.client_order_id) : undefined;
      return {
        id: e.id,
        at: e.created_at,
        ticker: e.ticker,
        source: (e.source === 'sniper' ? 'sniper' : 'bot') as RustSource,
        mode: e.mode,
        live: e.live,
        side: e.side,
        priceCents: num(e.price_cents),
        count: num(e.count),
        costCents: num(e.cost_cents),
        feeCents: num(e.fee_cents),
        modelProb: num(e.model_prob),
        edgeCents: num(e.edge_cents),
        result: s?.result ?? null,
        pnlCents: s ? num(s.pnl_cents) : null,
        settledAt: s?.created_at ?? null,
      };
    })
    .reverse();

  const totals = {
    ...tally(trades),
    bySource: {
      bot: tally(trades.filter((t) => t.source === 'bot')),
      sniper: tally(trades.filter((t) => t.source === 'sniper')),
    },
  };

  const newestWatch = new Map<string, KalshirustEvent>();
  for (const e of byTime) {
    if (e.kind === 'watch' && e.ticker && now - Date.parse(e.created_at) < WATCH_WINDOW_MS) {
      newestWatch.set(e.ticker, e);
    }
  }
  const watchlist: WatchRow[] = [...newestWatch.values()]
    .map((e) => ({
      ticker: e.ticker as string,
      title: e.title,
      subtitle: e.subtitle,
      closeTime: e.close_time,
      secondsToClose: num(e.seconds_to_close),
      strikeType: e.strike_type,
      strike: num(e.strike),
      capStrike: num(e.cap_strike),
      spot: num(e.spot),
      yesAskCents: num(e.yes_ask_cents),
      noAskCents: num(e.no_ask_cents),
      modelProb: num(e.model_prob),
      side: e.side,
      priceCents: num(e.price_cents),
      edgeCents: num(e.edge_cents),
      at: e.created_at,
    }))
    .sort((a, b) => (b.edgeCents ?? -Infinity) - (a.edgeCents ?? -Infinity))
    .slice(0, WATCH_LIMIT);

  const history: HistoryPoint[] = statuses.slice(-HISTORY_POINTS).map((e) => ({
    t: Date.parse(e.created_at),
    modelProb: num(e.model_prob),
    yesAskCents: num(e.yes_ask_cents),
    spot: num(e.spot),
    strike: num(e.strike),
    secondsToClose: num(e.seconds_to_close),
  }));

  const errors = byTime
    .filter((e) => e.kind === 'error')
    .slice(-5)
    .reverse()
    .map((e) => ({ at: e.created_at, message: e.message ?? 'error' }));

  return { status, online, trades, totals, watchlist, history, errors };
}

function tally(trades: Trade[]): Totals {
  const settled = trades.filter((t) => t.result != null);
  const wins = settled.filter((t) => t.result === t.side).length;
  const riskedCents = settled.reduce((a, t) => a + (t.costCents ?? 0) + (t.feeCents ?? 0), 0);
  const pnlCents = settled.reduce((a, t) => a + (t.pnlCents ?? 0), 0);
  return {
    trades: trades.length,
    settled: settled.length,
    wins,
    losses: settled.length - wins,
    hitRate: settled.length ? wins / settled.length : null,
    riskedCents,
    pnlCents,
    roi: riskedCents > 0 ? pnlCents / riskedCents : null,
  };
}
