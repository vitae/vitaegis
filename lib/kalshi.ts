// Shared types and pure logic for the Kalshi bot pages. The bot (scripts/kalshi_bot.py)
// writes kalshi_events and broadcasts on the Realtime topic `kalshi`; /api/kalshi and
// /api/admin/kalshi reduce the rows with the functions here. Money is in integer cents.

export type KalshiEventKind = 'tick' | 'order' | 'settle' | 'error' | 'status';
export type Side = 'yes' | 'no';
/** [seconds to close, YES ask ¢, NO ask ¢] each time the bot saw the book change. */
export type PathPoint = [number, number | null, number | null];

export interface KalshiEvent {
  id: string;
  created_at: string;
  kind: KalshiEventKind;
  live: boolean;
  ticker: string | null;
  title: string | null;
  close_time: string | null;
  seconds_to_close: number | null;
  yes_ask_cents: number | null;
  no_ask_cents: number | null;
  client_order_id: string | null;
  outcome: Side | null;
  price_cents: number | null;
  count: number | null;
  order_id: string | null;
  fill_count: number | null;
  remaining_count: number | null;
  avg_fill_cents: number | null;
  fee_cents: number | null;
  latency_ms: number | null;
  result: Side | null;
  pnl_cents: number | null;
  settled_at: string | null;
  path: PathPoint[] | null;
  balance_cents: number | null;
  message: string | null;
}

/** What the bot broadcasts on the `kalshi` topic for every quote change. */
export interface TickPayload {
  ticker: string;
  title: string | null;
  close_time: string;
  seconds_to_close: number;
  yes_ask_cents: number | null;
  no_ask_cents: number | null;
  ts_ms: number;
  live: boolean;
  streaming: boolean;
}

export const BET_CENTS = 1000;
export const MIN_ENTRY = 8;
export const MAX_ENTRY = 28;
/** Candidate ceilings for the cheap side; 28 is the bot's current line (crowd at 72%+). */
export const THRESHOLDS = [20, 24, 28, 30, 32, 36, 40, 44, 50];
/** The bot heartbeats at least once a minute; past this it is offline. */
export const STALE_MS = 90_000;
const DAY_MS = 86_400_000;

export interface Entry {
  outcome: Side;
  priceCents: number;
}

/** Mirrors find_entry in scripts/kalshi_bot.py: the cheap side when the other is heavy. */
export function entryZone(
  yesAsk: number | null,
  noAsk: number | null,
  minCents = MIN_ENTRY,
  maxCents = MAX_ENTRY,
): Entry | null {
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

/** Kalshi's taker fee, ceil(0.07 · C · P · (1 − P)) dollars, in cents. */
export function kalshiFeeCents(contracts: number, priceCents: number): number {
  const p = priceCents / 100;
  return Math.ceil(7 * contracts * p * (1 - p) - 1e-9);
}

export function contractsFor(betCents: number, priceCents: number): number {
  return Math.floor(betCents / priceCents);
}

/** Realized profit after fees once a market settles. */
export function pnlCents(
  outcome: Side,
  result: Side,
  contracts: number,
  priceCents: number,
  feeCents: number,
): number {
  if (contracts <= 0) return -feeCents;
  return outcome === result
    ? contracts * (100 - priceCents) - feeCents
    : -(contracts * priceCents) - feeCents;
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------
export interface Trade {
  id: string;
  at: string;
  live: boolean;
  ticker: string;
  title: string;
  outcome: Side;
  /** Price we asked for and, when live and filled, the average we actually paid. */
  askedCents: number;
  entryCents: number;
  requested: number;
  contracts: number;
  stakeCents: number;
  feeCents: number;
  /** What the position pays if it wins, after fees. */
  maxProfitCents: number;
  latencyMs: number | null;
  secondsToClose: number | null;
  closeTime: string | null;
  settled: boolean;
  result: Side | null;
  won: boolean | null;
  pnlCents: number | null;
  /** Profit over stake, 0.5 = +50%. */
  roi: number | null;
  settledAt: string | null;
  orderId: string | null;
}

export function tradeFrom(e: KalshiEvent): Trade {
  const requested = e.count ?? 0;
  const contracts = e.live && e.fill_count != null ? e.fill_count : requested;
  const asked = e.price_cents ?? 0;
  const entry = e.avg_fill_cents ?? asked;
  const stake = contracts * entry;
  const fee = e.fee_cents ?? kalshiFeeCents(contracts, entry);
  const outcome = e.outcome ?? 'yes';
  const settled = e.result != null;
  const pnl = settled
    ? (e.pnl_cents ?? pnlCents(outcome, e.result as Side, contracts, entry, fee))
    : null;
  return {
    id: e.id,
    at: e.created_at,
    live: e.live,
    ticker: e.ticker ?? '',
    title: marketTitle(e.ticker, e.title),
    outcome,
    askedCents: asked,
    entryCents: entry,
    requested,
    contracts,
    stakeCents: stake,
    feeCents: fee,
    maxProfitCents: contracts * (100 - entry) - fee,
    latencyMs: e.latency_ms,
    secondsToClose: e.seconds_to_close,
    closeTime: e.close_time,
    settled,
    result: e.result,
    won: settled ? e.result === outcome : null,
    pnlCents: pnl,
    roi: settled && stake > 0 && pnl != null ? pnl / stake : null,
    settledAt: e.settled_at,
    orderId: e.order_id,
  };
}

export interface Performance {
  trades: number;
  settled: number;
  open: number;
  wins: number;
  winRate: number | null;
  netCents: number;
  stakedCents: number;
  roi: number | null;
  avgEntryCents: number | null;
  /** Win rate needed to break even at the average entry, fees included. */
  breakevenWinRate: number | null;
  avgLatencyMs: number | null;
  avgSecondsToClose: number | null;
  best: Trade | null;
  worst: Trade | null;
  /** Cumulative P&L after each settled trade, oldest first. */
  equity: { at: string; cumCents: number; tradeId: string }[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function performance(trades: Trade[]): Performance {
  const settled = trades
    .filter((t) => t.settled && t.pnlCents != null)
    .sort((a, b) => (a.settledAt ?? a.at).localeCompare(b.settledAt ?? b.at));
  const wins = settled.filter((t) => t.won).length;
  const net = settled.reduce((a, t) => a + (t.pnlCents ?? 0), 0);
  const staked = settled.reduce((a, t) => a + t.stakeCents, 0);
  const avgEntry = mean(settled.map((t) => t.entryCents));
  const avgFeePerContract = mean(
    settled.filter((t) => t.contracts > 0).map((t) => t.feeCents / t.contracts),
  );
  let cum = 0;
  const equity = settled.map((t) => {
    cum += t.pnlCents ?? 0;
    return { at: t.settledAt ?? t.at, cumCents: cum, tradeId: t.id };
  });
  const byPnl = [...settled].sort((a, b) => (a.pnlCents ?? 0) - (b.pnlCents ?? 0));
  return {
    trades: trades.length,
    settled: settled.length,
    open: trades.length - settled.length,
    wins,
    winRate: settled.length ? wins / settled.length : null,
    netCents: net,
    stakedCents: staked,
    roi: staked > 0 ? net / staked : null,
    avgEntryCents: avgEntry,
    breakevenWinRate:
      avgEntry != null ? Math.min(1, (avgEntry + (avgFeePerContract ?? 0)) / 100) : null,
    avgLatencyMs: mean(trades.filter((t) => t.latencyMs != null).map((t) => t.latencyMs as number)),
    avgSecondsToClose: mean(
      trades.filter((t) => t.secondsToClose != null).map((t) => t.secondsToClose as number),
    ),
    best: byPnl.at(-1) ?? null,
    worst: byPnl[0] ?? null,
    equity,
  };
}

// ---------------------------------------------------------------------------
// Threshold backtest over recorded quote paths
// ---------------------------------------------------------------------------
export interface Simulated {
  outcome: Side;
  priceCents: number;
  contracts: number;
  feeCents: number;
  pnlCents: number;
  secondsToClose: number;
}

/** Replay one market's quote path with a different ceiling; null when it never qualified. */
export function simulateMarket(
  path: PathPoint[],
  result: Side,
  maxEntry: number,
  minEntry = MIN_ENTRY,
  betCents = BET_CENTS,
): Simulated | null {
  for (const [secs, yes, no] of path) {
    const entry = entryZone(yes, no, minEntry, maxEntry);
    if (!entry) continue;
    const contracts = contractsFor(betCents, entry.priceCents);
    if (contracts < 1) return null;
    const fee = kalshiFeeCents(contracts, entry.priceCents);
    return {
      outcome: entry.outcome,
      priceCents: entry.priceCents,
      contracts,
      feeCents: fee,
      pnlCents: pnlCents(entry.outcome, result, contracts, entry.priceCents, fee),
      secondsToClose: secs,
    };
  }
  return null;
}

export interface ThresholdRow {
  maxEntry: number;
  /** The crowd share that makes the other side this cheap: 100 − maxEntry. */
  heavy: number;
  trades: number;
  wins: number;
  winRate: number | null;
  netCents: number;
  stakedCents: number;
  roi: number | null;
  avgEntryCents: number | null;
  current: boolean;
}

export interface Backtest {
  markets: number;
  rows: ThresholdRow[];
  best: ThresholdRow | null;
  current: ThresholdRow | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
}

export function backtest(settles: KalshiEvent[], thresholds = THRESHOLDS): Backtest {
  const usable = settles.filter(
    (s) => (s.result === 'yes' || s.result === 'no') && Array.isArray(s.path) && s.path.length,
  );
  const rows = thresholds.map((maxEntry): ThresholdRow => {
    const sims = usable
      .map((s) => simulateMarket(s.path as PathPoint[], s.result as Side, maxEntry))
      .filter((x): x is Simulated => x != null);
    const wins = sims.filter((x) => x.pnlCents > 0).length;
    const net = sims.reduce((a, x) => a + x.pnlCents, 0);
    const staked = sims.reduce((a, x) => a + x.contracts * x.priceCents, 0);
    return {
      maxEntry,
      heavy: 100 - maxEntry,
      trades: sims.length,
      wins,
      winRate: sims.length ? wins / sims.length : null,
      netCents: net,
      stakedCents: staked,
      roi: staked > 0 ? net / staked : null,
      avgEntryCents: mean(sims.map((x) => x.priceCents)),
      current: maxEntry === MAX_ENTRY,
    };
  });
  const eligible = rows.filter((r) => r.trades >= 5);
  const best = eligible.length
    ? eligible.reduce((a, b) => (b.netCents > a.netCents ? b : a))
    : null;
  const n = usable.length;
  return {
    markets: n,
    rows,
    best,
    current: rows.find((r) => r.current) ?? null,
    confidence: n === 0 ? 'none' : n < 30 ? 'low' : n < 100 ? 'medium' : 'high',
  };
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------
const MONTHS: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

/** Kalshi's own title when we have it; else read the ticker (KXBTC15M-26OCT311630-30). */
export function marketTitle(ticker: string | null, title: string | null): string {
  if (title) return title;
  const m = ticker?.match(/-(\d{2})([A-Z]{3})(\d{2})(\d{2})(\d{2})-/);
  if (!m || !(m[2] in MONTHS)) return ticker ?? '—';
  const h = Number(m[4]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `Bitcoin at ${h12}:${m[5]} ${ampm} ET · ${m[2][0]}${m[2].slice(1).toLowerCase()} ${Number(m[3])}`;
}

export const dollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

export const signedDollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `${cents < 0 ? '−' : '+'}$${(Math.abs(cents) / 100).toFixed(2)}`;

export const pct = (x: number | null | undefined, digits = 0) =>
  x == null ? '—' : `${(x * 100).toFixed(digits)}%`;

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------
export interface KalshiMarket {
  ticker: string;
  title: string;
  closeTime: string | null;
  yesAsk: number | null;
  noAsk: number | null;
  entry: Entry | null;
  /** YES and NO asks over this market's life, oldest first. */
  series: { t: number; yes: number | null; no: number | null }[];
}

/** For /admin/kalshi: the newest few hundred rows of any kind. */
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
  performance: Performance;
}

function marketFrom(ticks: KalshiEvent[]): KalshiMarket | null {
  const newest = ticks.find((e) => e.ticker);
  if (!newest) return null;
  const own = ticks.filter((e) => e.ticker === newest.ticker).reverse();
  return {
    ticker: newest.ticker as string,
    title: marketTitle(newest.ticker, newest.title),
    closeTime: newest.close_time,
    yesAsk: newest.yes_ask_cents,
    noAsk: newest.no_ask_cents,
    entry: entryZone(newest.yes_ask_cents, newest.no_ask_cents),
    series: own.map((e) => ({
      t: Date.parse(e.created_at),
      yes: e.yes_ask_cents,
      no: e.no_ask_cents,
    })),
  };
}

export function summarize(events: KalshiEvent[], now = Date.now()): KalshiSummary {
  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const newest = sorted[0] ?? null;
  const lastSeen = newest?.created_at ?? null;
  const orders = sorted.filter((e) => e.kind === 'order');
  const since = now - DAY_MS;
  return {
    lastSeen,
    online: lastSeen != null && now - Date.parse(lastSeen) < STALE_MS,
    live: newest ? newest.live : null,
    balanceCents: sorted.find((e) => e.balance_cents != null)?.balance_cents ?? null,
    market: marketFrom(sorted.filter((e) => e.kind === 'tick')),
    orders24h: orders.filter((e) => Date.parse(e.created_at) >= since).length,
    orders: orders.slice(0, 50),
    errors: sorted.filter((e) => e.kind === 'error').slice(0, 20),
    ticks: sorted.filter((e) => e.kind === 'tick').slice(0, 40),
    performance: performance(orders.map(tradeFrom)),
  };
}

export interface SettledMarket {
  ticker: string;
  title: string;
  closeTime: string | null;
  result: Side;
  settledAt: string | null;
  trades: Trade[];
}

/** For the public /kalshi page. Carries no balance. */
export interface PublicSummary {
  lastSeen: string | null;
  online: boolean;
  live: boolean | null;
  market: KalshiMarket | null;
  performance: Performance;
  trades: Trade[];
  backtest: Backtest;
  markets: SettledMarket[];
  errors: { at: string; message: string }[];
  generatedAt: string;
}

export function publicSummary(
  input: {
    newest: KalshiEvent | null;
    ticks: KalshiEvent[];
    orders: KalshiEvent[];
    settles: KalshiEvent[];
    errors: KalshiEvent[];
  },
  now = Date.now(),
): PublicSummary {
  const desc = (xs: KalshiEvent[]) =>
    [...xs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const trades = desc(input.orders).map(tradeFrom);
  const settles = desc(input.settles);
  const lastSeen = input.newest?.created_at ?? null;
  return {
    lastSeen,
    online: lastSeen != null && now - Date.parse(lastSeen) < STALE_MS,
    live: input.newest ? input.newest.live : null,
    market: marketFrom(desc(input.ticks)),
    performance: performance(trades),
    trades,
    backtest: backtest(settles),
    markets: settles.slice(0, 30).map((s) => ({
      ticker: s.ticker ?? '',
      title: marketTitle(s.ticker, s.title),
      closeTime: s.close_time,
      result: s.result as Side,
      settledAt: s.settled_at,
      trades: trades.filter((t) => t.ticker === s.ticker),
    })),
    errors: desc(input.errors)
      .slice(0, 10)
      .map((e) => ({ at: e.created_at, message: e.message ?? '' })),
    generatedAt: new Date(now).toISOString(),
  };
}
