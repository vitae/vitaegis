// Types and pure logic for the /kalshi HUD. The Rust bot (C:\vitaegis\kalshirust, running as
// kalshi-bot.service on the Lightsail VPS) writes two tables in the site's Supabase project:
// market_windows and trade_executions. The HUD reads them with the anon key over Realtime
// and polls the bot's optional HTTP status endpoint through /api/bot-status.
// Contract: docs/kalshi-hud.md. Money on screen is in cents; probabilities are 0–1.

export type Side = 'yes' | 'no';

/** Hard ceiling on entries in one 15-minute contract window. */
export const MAX_BETS_PER_WINDOW = 2;
export const GBM_WEIGHT = 0.4;
export const ML_WEIGHT = 0.6;
/** Stake unit for Kelly sizing on the matrix. */
export const BET_CENTS = 1000;
/** A status older than this means the bot has gone quiet. */
export const STALE_MS = 90_000;
/** Annualized BTC volatility assumed until the spot feed has enough history. */
export const DEFAULT_SIGMA = 0.6;
const SECONDS_PER_YEAR = 365.25 * 86_400;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Rows, exactly as the bot's tables define them
// ---------------------------------------------------------------------------
/** market_windows: one row per 15-minute contract. */
export interface MarketWindow {
  id: number;
  ticker: string;
  strike: number | null;
  close_time: string;
  bets_placed: number | null;
  status: string | null;
  created_at: string | null;
  /** Optional columns the bot may add; the HUD uses them when present. */
  result?: string | null;
  title?: string | null;
  open_time?: string | null;
}

/** trade_executions: one row per order the bot sent. */
export interface TradeExecution {
  id: number;
  window_ticker: string;
  /** YES or NO (any casing; "buy_yes" style values are read too). */
  action: string;
  /** Contract price: dollars (0.35) or cents (35); both are read. */
  price: number;
  /** Contracts bought. */
  size: number;
  /** The bot's blended model P(YES), 0–1 (or 0–100). */
  blended_prob: number;
  executed_at: string | null;
  /** Optional columns the bot may add; the HUD uses them when present. */
  gbm_prob?: number | null;
  ml_prob?: number | null;
  result?: string | null;
  pnl?: number | null;
  fee?: number | null;
  latency_ms?: number | null;
}

/** What the bot's HTTP status endpoint returns (GET $KALSHI_BOT_URL/status), all optional. */
export interface BotStatusWire {
  ok?: boolean;
  version?: string;
  uptime_s?: number;
  live?: boolean;
  kalshi_ws?: 'active' | 'down' | boolean;
  ticker?: string | null;
  close_time?: string | null;
  strike?: number | null;
  spot?: number | null;
  bets_in_window?: number;
  bankroll_cents?: number | null;
  logs?: { ts?: string; level?: string; msg?: string }[];
}

/** What /api/bot-status returns to the HUD. */
export interface BotStatus {
  vps: {
    configured: boolean;
    ok: boolean | null;
    latencyMs: number | null;
    version: string | null;
    uptimeS: number | null;
    detail: string | null;
  };
  live: boolean | null;
  kalshiWs: boolean | null;
  ticker: string | null;
  closeTime: string | null;
  strike: number | null;
  spot: number | null;
  betsInWindow: number | null;
  bankrollCents?: number | null;
  logs: LogLine[];
  market: MarketInfo | null;
  generatedAt: string;
}

export type StrikeType = 'greater' | 'greater_or_equal' | 'less' | 'less_or_equal' | string;

/** The market as Kalshi's public API describes it: strike, both asks, volume. */
export interface MarketInfo {
  ticker: string;
  title: string;
  subtitle: string | null;
  openTime: string | null;
  closeTime: string | null;
  strike: number | null;
  strikeType: StrikeType | null;
  yesAsk: number | null;
  yesBid: number | null;
  noAsk: number | null;
  volume: number | null;
  openInterest: number | null;
}

// ---------------------------------------------------------------------------
// Reading the bot's values
// ---------------------------------------------------------------------------
/** "YES", "no", "buy_yes", "BUY NO" → the side bought. */
export function sideOf(action: string | null | undefined): Side | null {
  const a = (action ?? '').toLowerCase();
  if (/\byes\b|_yes$|^yes/.test(a)) return 'yes';
  if (/\bno\b|_no$|^no/.test(a)) return 'no';
  return null;
}

/** 0.35 or 35 → 35¢. */
export const priceCents = (price: number | null | undefined) =>
  price == null ? null : Math.round(price > 1 ? price : price * 100);

/** 0.62 or 62 → 0.62. */
export const probOf = (p: number | null | undefined) =>
  p == null ? null : Math.min(1, Math.max(0, p > 1 ? p / 100 : p));

/** YES, NO, settled_yes, won_no… → the market's result. */
export function resultOf(value: string | null | undefined): Side | null {
  const v = (value ?? '').toLowerCase();
  if (/yes/.test(v)) return 'yes';
  if (/\bno\b|_no$|^no$/.test(v)) return 'no';
  return null;
}

export const executedAt = (x: TradeExecution) => x.executed_at ?? '';

/** Contracts × entry price, in cents. */
export const stakeCents = (x: TradeExecution) => Math.round(x.size * (priceCents(x.price) ?? 0));

/** Kalshi's taker fee, ceil(0.07 · C · P · (1 − P)) dollars, in cents. */
export function kalshiFeeCents(contracts: number, cents: number): number {
  const p = cents / 100;
  return Math.ceil(7 * contracts * p * (1 - p) - 1e-9);
}

/** Realized P&L after fees once the window has a result; null while it is open. */
export function executionPnlCents(x: TradeExecution, windowResult: Side | null): number | null {
  if (x.pnl != null) return Math.round(x.pnl > 100 || x.pnl < -100 ? x.pnl : x.pnl * 100);
  const result = resultOf(x.result) ?? windowResult;
  const side = sideOf(x.action);
  const entry = priceCents(x.price);
  if (!result || !side || entry == null) return null;
  const fee =
    x.fee != null ? Math.round(x.fee > 1 ? x.fee : x.fee * 100) : kalshiFeeCents(x.size, entry);
  return side === result
    ? Math.round(x.size * (100 - entry)) - fee
    : -Math.round(x.size * entry) - fee;
}

export const windowResult = (w: MarketWindow | null | undefined): Side | null =>
  w ? (resultOf(w.result) ?? resultOf(w.status)) : null;

// ---------------------------------------------------------------------------
// Window execution tracker (max 2 bets per window)
// ---------------------------------------------------------------------------
export interface WindowTracker {
  ticker: string | null;
  placed: number;
  max: number;
  remaining: number;
  locked: boolean;
  slots: ('filled' | 'open')[];
  executions: TradeExecution[];
  stakeCents: number;
  pnlCents: number | null;
}

/** Entries in the current window against the per-window cap. `reported` is the bot's own
 *  count (market_windows.bets_placed or the status endpoint) when it is higher. */
export function windowTracker(
  executions: TradeExecution[],
  ticker: string | null,
  reported: (number | null | undefined)[] = [],
  result: Side | null = null,
  max = MAX_BETS_PER_WINDOW,
): WindowTracker {
  const own = ticker
    ? executions
        .filter((x) => x.window_ticker === ticker)
        .sort((a, b) => executedAt(a).localeCompare(executedAt(b)))
    : [];
  const count = Math.max(own.length, ...reported.map((n) => n ?? 0));
  const pnls = own.map((x) => executionPnlCents(x, result)).filter((p): p is number => p != null);
  return {
    ticker,
    placed: Math.min(count, max),
    max,
    remaining: Math.max(0, max - count),
    locked: count >= max,
    slots: Array.from({ length: max }, (_, i) => (i < count ? 'filled' : 'open')),
    executions: own,
    stakeCents: own.reduce((a, x) => a + stakeCents(x), 0),
    pnlCents: pnls.length ? pnls.reduce((a, b) => a + b, 0) : null,
  };
}

/** `[● ◯]` for one of two bets placed. */
export const slotGlyphs = (slots: WindowTracker['slots']) =>
  `[${slots.map((s) => (s === 'filled' ? '●' : '◯')).join(' ')}]`;

// ---------------------------------------------------------------------------
// Performance from executions and window results
// ---------------------------------------------------------------------------
export interface Performance {
  trades: number;
  settled: number;
  open: number;
  wins: number;
  winRate: number | null;
  netCents: number;
  net24hCents: number;
  stakedCents: number;
  openStakeCents: number;
  roi: number | null;
  avgEntryCents: number | null;
  avgBlended: number | null;
  equity: { at: string; cumCents: number }[];
}

export function performance(
  executions: TradeExecution[],
  windows: MarketWindow[],
  now = Date.now(),
): Performance {
  const byTicker = new Map(windows.map((w) => [w.ticker, w]));
  const rows = executions
    .map((x) => ({ x, pnl: executionPnlCents(x, windowResult(byTicker.get(x.window_ticker))) }))
    .sort((a, b) => executedAt(a.x).localeCompare(executedAt(b.x)));
  const settled = rows.filter((r) => r.pnl != null) as { x: TradeExecution; pnl: number }[];
  const wins = settled.filter((r) => r.pnl > 0).length;
  const net = settled.reduce((a, r) => a + r.pnl, 0);
  const since = now - DAY_MS;
  const staked = settled.reduce((a, r) => a + stakeCents(r.x), 0);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  let cum = 0;
  return {
    trades: rows.length,
    settled: settled.length,
    open: rows.length - settled.length,
    wins,
    winRate: settled.length ? wins / settled.length : null,
    netCents: net,
    net24hCents: settled
      .filter((r) => Date.parse(executedAt(r.x)) >= since)
      .reduce((a, r) => a + r.pnl, 0),
    stakedCents: staked,
    openStakeCents: rows.filter((r) => r.pnl == null).reduce((a, r) => a + stakeCents(r.x), 0),
    roi: staked > 0 ? net / staked : null,
    avgEntryCents: mean(rows.map((r) => priceCents(r.x.price) ?? 0)),
    avgBlended: mean(rows.map((r) => probOf(r.x.blended_prob) ?? 0)),
    equity: settled.map((r) => {
      cum += r.pnl;
      return { at: executedAt(r.x), cumCents: cum };
    }),
  };
}

// ---------------------------------------------------------------------------
// Models: GBM, the 40/60 blend, edge and Kelly
// ---------------------------------------------------------------------------
/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z * z)));
}

/** Annualized realized volatility from a spot history; null until there is enough of it. */
export function realizedVol(
  history: { t: number; p: number }[],
  minSamples = 30,
  minSpanMs = 30_000,
): number | null {
  if (history.length < minSamples) return null;
  const span = history[history.length - 1].t - history[0].t;
  if (span < minSpanMs) return null;
  const rets: number[] = [];
  for (let i = 1; i < history.length; i++) {
    if (history[i].p > 0 && history[i - 1].p > 0)
      rets.push(Math.log(history[i].p / history[i - 1].p));
  }
  if (rets.length < 2) return null;
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, r) => a + (r - m) ** 2, 0) / (rets.length - 1);
  const dtSec = span / 1000 / rets.length;
  if (dtSec <= 0) return null;
  return Math.min(2.5, Math.max(0.25, Math.sqrt(v / dtSec) * Math.sqrt(SECONDS_PER_YEAR)));
}

/** P(YES) under driftless geometric Brownian motion: spot ends on the strike's YES side. */
export function gbmProbability(
  spot: number | null,
  strike: number | null,
  secondsToClose: number | null,
  sigma = DEFAULT_SIGMA,
  strikeType: StrikeType | null = 'greater_or_equal',
): number | null {
  if (spot == null || strike == null || secondsToClose == null || spot <= 0 || strike <= 0)
    return null;
  const above = !strikeType || strikeType.startsWith('greater');
  const T = Math.max(0, secondsToClose) / SECONDS_PER_YEAR;
  let pAbove: number;
  if (T === 0 || sigma <= 0) {
    pAbove = spot > strike ? 1 : spot < strike ? 0 : 0.5;
  } else {
    const d2 = (Math.log(spot / strike) - (sigma * sigma * T) / 2) / (sigma * Math.sqrt(T));
    pAbove = normalCdf(d2);
  }
  return above ? pAbove : 1 - pAbove;
}

/** Kelly fraction for a binary contract bought at `cents` that pays 100¢ with chance q. */
export function kellyFraction(q: number, cents: number): number {
  const p = cents / 100;
  if (p <= 0 || p >= 1) return 0;
  return Math.max(0, (q - p) / (1 - p));
}

export interface ModelMatrix {
  gbm: number | null;
  ml: number | null;
  /** The bot's blended_prob when it has traded this window; else 0.4·GBM + 0.6·ML, else GBM. */
  composite: number | null;
  /** Kalshi's implied P(YES): the YES/NO mid when both sides quote, else the YES ask. */
  market: number | null;
  edge: number | null;
  side: Side | null;
  /** Edge on the chosen side in cents, after Kalshi's taker fee per contract. */
  edgeCents: number | null;
  kelly: number | null;
  kellyStakeCents: number | null;
  /** Where the composite came from. */
  source: 'bot' | 'blend' | 'gbm' | 'none';
  sigma: number;
  sigmaSource: 'realized' | 'default';
}

export function modelMatrix(input: {
  gbm: number | null;
  ml?: number | null;
  blended?: number | null;
  yesAsk: number | null;
  noAsk: number | null;
  sigma?: number | null;
  betCents?: number;
}): ModelMatrix {
  const ml = input.ml ?? null;
  const blended = input.blended ?? null;
  const composite =
    blended != null
      ? blended
      : input.gbm == null
        ? null
        : ml == null
          ? input.gbm
          : GBM_WEIGHT * input.gbm + ML_WEIGHT * ml;
  const source: ModelMatrix['source'] =
    blended != null ? 'bot' : composite == null ? 'none' : ml == null ? 'gbm' : 'blend';
  const yes = input.yesAsk;
  const no = input.noAsk;
  const market =
    yes != null && no != null ? (yes + (100 - no)) / 200 : yes != null ? yes / 100 : null;
  let side: Side | null = null;
  let edgeCents: number | null = null;
  let kelly: number | null = null;
  if (composite != null && yes != null && no != null) {
    const feeYes = 7 * (yes / 100) * (1 - yes / 100);
    const feeNo = 7 * (no / 100) * (1 - no / 100);
    const yesEdge = composite * 100 - yes - feeYes;
    const noEdge = (1 - composite) * 100 - no - feeNo;
    if (yesEdge >= noEdge) {
      side = 'yes';
      edgeCents = yesEdge;
      kelly = kellyFraction(composite, yes);
    } else {
      side = 'no';
      edgeCents = noEdge;
      kelly = kellyFraction(1 - composite, no);
    }
    if (edgeCents <= 0) side = null;
  }
  const bet = input.betCents ?? BET_CENTS;
  return {
    gbm: input.gbm,
    ml,
    composite,
    market,
    edge: composite != null && market != null ? composite - market : null,
    side,
    edgeCents,
    kelly,
    kellyStakeCents: kelly == null ? null : Math.round(Math.min(1, kelly) * bet),
    source,
    sigma: input.sigma ?? DEFAULT_SIGMA,
    sigmaSource: input.sigma == null ? 'default' : 'realized',
  };
}

// ---------------------------------------------------------------------------
// Terminal lines
// ---------------------------------------------------------------------------
export type LogLevel = 'tick' | 'info' | 'ok' | 'warn' | 'err';

export interface LogLine {
  id: string;
  at: string;
  level: LogLevel;
  text: string;
}

export const shortTicker = (ticker: string | null | undefined) =>
  ticker?.replace(/^KXBTC15M-/, '') ?? '—';

export const dollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

export const signedDollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `${cents < 0 ? '−' : '+'}$${(Math.abs(cents) / 100).toFixed(2)}`;

export const pct = (x: number | null | undefined, digits = 0) =>
  x == null ? '—' : `${(x * 100).toFixed(digits)}%`;

export function executionLine(x: TradeExecution, result: Side | null = null, n?: number): LogLine {
  const pnl = executionPnlCents(x, result);
  const side = sideOf(x.action)?.toUpperCase() ?? x.action;
  const settled = pnl != null ? ` → ${pnl > 0 ? 'WON' : 'LOST'} ${signedDollars(pnl)}` : '';
  return {
    id: `exec-${x.id}`,
    at: executedAt(x),
    level: pnl != null && pnl <= 0 ? 'warn' : 'ok',
    text: `BET${n ? ` ${n}/${MAX_BETS_PER_WINDOW}` : ''} BUY ${side} ${shortTicker(x.window_ticker)} ${x.size}×${priceCents(x.price)}¢ stake ${dollars(stakeCents(x))} p=${pct(probOf(x.blended_prob), 1)}${x.latency_ms != null ? ` ${x.latency_ms}ms` : ''}${settled}`,
  };
}

export function windowLine(w: MarketWindow): LogLine {
  const result = windowResult(w);
  const text = result
    ? `window ${shortTicker(w.ticker)} settled ${result.toUpperCase()}`
    : `window ${shortTicker(w.ticker)} ${w.status ?? 'open'}${w.strike != null ? ` strike $${w.strike.toLocaleString('en-US')}` : ''} ${w.bets_placed ?? 0}/${MAX_BETS_PER_WINDOW} bets`;
  return {
    id: `win-${w.id}-${w.status ?? ''}`,
    at: w.created_at ?? w.close_time,
    level: 'info',
    text,
  };
}

/** Normalizes a log entry from the bot's status endpoint. */
export function wireLogLine(l: { ts?: string; level?: string; msg?: string }, i: number): LogLine {
  const lvl = (l.level ?? '').toLowerCase();
  return {
    id: `vps-${l.ts ?? i}-${i}`,
    at: l.ts ?? new Date(0).toISOString(),
    level: lvl.startsWith('err')
      ? 'err'
      : lvl.startsWith('warn')
        ? 'warn'
        : lvl === 'debug' || lvl === 'trace'
          ? 'tick'
          : 'info',
    text: `vps ${l.msg ?? ''}`.trim(),
  };
}

/** Merges lines by id, oldest first, capped. */
export function mergeLines(existing: LogLine[], incoming: LogLine[], keep = 300): LogLine[] {
  const byId = new Map(existing.map((l) => [l.id, l]));
  for (const l of incoming) byId.set(l.id, l);
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-keep);
}

// ---------------------------------------------------------------------------
// Status normalization and window selection
// ---------------------------------------------------------------------------
export function normalizeWire(
  w: BotStatusWire,
): Omit<BotStatus, 'vps' | 'market' | 'generatedAt' | 'bankrollCents'> {
  return {
    live: w.live ?? null,
    kalshiWs: w.kalshi_ws == null ? null : w.kalshi_ws === true || w.kalshi_ws === 'active',
    ticker: w.ticker ?? null,
    closeTime: w.close_time ?? null,
    strike: w.strike ?? null,
    spot: w.spot ?? null,
    betsInWindow: w.bets_in_window ?? null,
    logs: (w.logs ?? []).slice(-100).map(wireLogLine),
  };
}

export const isFresh = (iso: string | null | undefined, now = Date.now(), staleMs = STALE_MS) =>
  iso != null && now - Date.parse(iso) < staleMs;

/** The window to show: the bot's, else the soonest open row, else null. */
export function currentWindow(
  windows: MarketWindow[],
  ticker: string | null,
  now = Date.now(),
): MarketWindow | null {
  if (ticker) {
    const own = windows.find((w) => w.ticker === ticker);
    if (own) return own;
  }
  return (
    windows
      .filter((w) => Date.parse(w.close_time) > now)
      .sort((a, b) => a.close_time.localeCompare(b.close_time))[0] ?? null
  );
}
