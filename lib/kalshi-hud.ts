// Types and pure logic for the /kalshi HUD, which reads the Rust bot's three tables
// (market_windows, bot_signals, trade_executions) over Supabase Realtime and polls the bot's
// HTTP status endpoint through /api/bot-status. Schema: supabase/migrations/*_kalshi_hud.sql;
// contract: docs/kalshi-hud.md. Money is in integer cents, probabilities are 0–1.

export type Side = 'yes' | 'no';

/** Hard ceiling on entries in one 15-minute contract window. */
export const MAX_BETS_PER_WINDOW = 2;
export const GBM_WEIGHT = 0.4;
export const ML_WEIGHT = 0.6;
/** $10 unit the bot bets, for Kelly sizing on the matrix. */
export const BET_CENTS = 1000;
/** A signal or status older than this means the bot has gone quiet. */
export const STALE_MS = 90_000;
/** Annualized BTC volatility assumed until the spot feed has enough history. */
export const DEFAULT_SIGMA = 0.6;
const SECONDS_PER_YEAR = 365.25 * 86_400;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
/** One 15-minute contract window. */
export interface MarketWindow {
  id: string;
  created_at: string;
  updated_at: string | null;
  ticker: string;
  event_ticker: string | null;
  title: string | null;
  open_time: string | null;
  close_time: string;
  strike: number | null;
  strike_type: string | null;
  spot_open: number | null;
  spot_close: number | null;
  status: 'open' | 'closed' | 'settled';
  result: Side | null;
  bets_placed: number;
  max_bets: number;
  pnl_cents: number | null;
}

/** One inference tick: both models against the book. */
export interface BotSignal {
  id: string;
  created_at: string;
  ticker: string;
  spot: number | null;
  strike: number | null;
  seconds_to_close: number | null;
  yes_ask_cents: number | null;
  no_ask_cents: number | null;
  gbm_prob: number | null;
  ml_prob: number | null;
  composite_prob: number | null;
  market_prob: number | null;
  edge: number | null;
  kelly: number | null;
  side: Side | null;
  action: 'buy' | 'hold' | 'skip' | null;
  reason: string | null;
  kalshi_ws: boolean | null;
  live: boolean;
}

export type ExecutionStatus = 'filled' | 'partial' | 'rejected' | 'dry_run' | 'settled';

/** One order the bot sent. */
export interface TradeExecution {
  id: string;
  created_at: string;
  ticker: string;
  window_id: string | null;
  bet_number: number;
  side: Side;
  price_cents: number;
  count: number;
  fill_count: number | null;
  avg_fill_cents: number | null;
  fee_cents: number | null;
  stake_cents: number | null;
  latency_ms: number | null;
  order_id: string | null;
  client_order_id: string | null;
  status: ExecutionStatus;
  result: Side | null;
  pnl_cents: number | null;
  settled_at: string | null;
  live: boolean;
}

/** What the Rust bot's HTTP status endpoint returns (GET $KALSHI_BOT_URL/status). Every
 *  field is optional on the wire; /api/bot-status normalizes it. */
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

export const stakeOf = (x: TradeExecution) =>
  x.stake_cents ?? (x.fill_count ?? x.count) * (x.avg_fill_cents ?? x.price_cents);

/** Entries in the current window against the per-window cap. Counts rows that reached the
 *  exchange; rejected orders do not use a slot. */
export function windowTracker(
  executions: TradeExecution[],
  ticker: string | null,
  max = MAX_BETS_PER_WINDOW,
): WindowTracker {
  const own = ticker
    ? executions
        .filter((x) => x.ticker === ticker)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];
  const counted = own.filter((x) => x.status !== 'rejected');
  const settled = own.filter((x) => x.pnl_cents != null);
  return {
    ticker,
    placed: Math.min(counted.length, max),
    max,
    remaining: Math.max(0, max - counted.length),
    locked: counted.length >= max,
    slots: Array.from({ length: max }, (_, i) => (i < counted.length ? 'filled' : 'open')),
    executions: own,
    stakeCents: counted.reduce((a, x) => a + stakeOf(x), 0),
    pnlCents: settled.length ? settled.reduce((a, x) => a + (x.pnl_cents ?? 0), 0) : null,
  };
}

/** `[● ◯]` for one of two bets placed. */
export const slotGlyphs = (slots: WindowTracker['slots']) =>
  `[${slots.map((s) => (s === 'filled' ? '●' : '◯')).join(' ')}]`;

// ---------------------------------------------------------------------------
// Performance from executions
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
  equity: { at: string; cumCents: number }[];
}

export function performance(executions: TradeExecution[], now = Date.now()): Performance {
  const real = executions.filter((x) => x.status !== 'rejected');
  const settled = real
    .filter((x) => x.pnl_cents != null)
    .sort((a, b) => (a.settled_at ?? a.created_at).localeCompare(b.settled_at ?? b.created_at));
  const wins = settled.filter((x) => (x.pnl_cents ?? 0) > 0).length;
  const net = settled.reduce((a, x) => a + (x.pnl_cents ?? 0), 0);
  const since = now - DAY_MS;
  const net24h = settled
    .filter((x) => Date.parse(x.settled_at ?? x.created_at) >= since)
    .reduce((a, x) => a + (x.pnl_cents ?? 0), 0);
  const staked = settled.reduce((a, x) => a + stakeOf(x), 0);
  let cum = 0;
  return {
    trades: real.length,
    settled: settled.length,
    open: real.length - settled.length,
    wins,
    winRate: settled.length ? wins / settled.length : null,
    netCents: net,
    net24hCents: net24h,
    stakedCents: staked,
    openStakeCents: real.filter((x) => x.pnl_cents == null).reduce((a, x) => a + stakeOf(x), 0),
    roi: staked > 0 ? net / staked : null,
    equity: settled.map((x) => {
      cum += x.pnl_cents ?? 0;
      return { at: x.settled_at ?? x.created_at, cumCents: cum };
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

/** Kelly fraction for a binary contract bought at `priceCents` that pays 100¢ with chance q. */
export function kellyFraction(q: number, priceCents: number): number {
  const p = priceCents / 100;
  if (p <= 0 || p >= 1) return 0;
  return Math.max(0, (q - p) / (1 - p));
}

export interface ModelMatrix {
  gbm: number | null;
  ml: number | null;
  /** 0.4·GBM + 0.6·ML, or GBM alone while the ML score is absent. */
  composite: number | null;
  /** Kalshi's implied P(YES): the YES/NO mid when both sides quote, else the YES ask. */
  market: number | null;
  edge: number | null;
  side: Side | null;
  /** Edge on the chosen side in cents, after Kalshi's taker fee per contract. */
  edgeCents: number | null;
  kelly: number | null;
  kellyStakeCents: number | null;
  /** Where the scores came from: the bot's signal row, or the HUD's own GBM fallback. */
  source: 'bot' | 'local';
  sigma: number;
  sigmaSource: 'realized' | 'default';
}

export function modelMatrix(input: {
  gbm: number | null;
  ml?: number | null;
  yesAsk: number | null;
  noAsk: number | null;
  sigma?: number | null;
  betCents?: number;
  source?: 'bot' | 'local';
}): ModelMatrix {
  const ml = input.ml ?? null;
  const composite =
    input.gbm == null ? null : ml == null ? input.gbm : GBM_WEIGHT * input.gbm + ML_WEIGHT * ml;
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
    source: input.source ?? 'local',
    sigma: input.sigma ?? DEFAULT_SIGMA,
    sigmaSource: input.sigma == null ? 'default' : 'realized',
  };
}

/** The matrix from the bot's own signal row (both models), or the HUD's GBM when it has none. */
export function matrixFromSignal(
  signal: BotSignal | null,
  local: {
    spot: number | null;
    strike: number | null;
    secondsToClose: number | null;
    sigma: number | null;
    strikeType: StrikeType | null;
  },
  book: { yesAsk: number | null; noAsk: number | null },
): ModelMatrix {
  if (signal && signal.gbm_prob != null) {
    return modelMatrix({
      gbm: signal.gbm_prob,
      ml: signal.ml_prob,
      yesAsk: book.yesAsk ?? signal.yes_ask_cents,
      noAsk: book.noAsk ?? signal.no_ask_cents,
      source: 'bot',
    });
  }
  return modelMatrix({
    gbm: gbmProbability(
      local.spot,
      local.strike,
      local.secondsToClose,
      local.sigma ?? DEFAULT_SIGMA,
      local.strikeType,
    ),
    ml: signal?.ml_prob ?? null,
    yesAsk: book.yesAsk,
    noAsk: book.noAsk,
    sigma: local.sigma,
    source: 'local',
  });
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

export function signalLine(s: BotSignal): LogLine {
  const act = s.action
    ? ` ${s.action.toUpperCase()}${s.side ? ` ${s.side.toUpperCase()}` : ''}`
    : '';
  return {
    id: `sig-${s.id}`,
    at: s.created_at,
    level: s.action === 'buy' ? 'ok' : 'tick',
    text: `signal ${shortTicker(s.ticker)} gbm=${pct(s.gbm_prob)} ml=${pct(s.ml_prob)} mkt=${pct(s.market_prob)} edge=${s.edge == null ? '—' : (s.edge * 100).toFixed(1) + '¢'}${act}${s.reason ? ` (${s.reason})` : ''}`,
  };
}

export function executionLine(x: TradeExecution): LogLine {
  const mode = x.live ? 'LIVE' : 'DRY';
  const fill = x.fill_count != null ? `fill ${x.fill_count}/${x.count}` : x.status;
  const settled =
    x.pnl_cents != null
      ? ` → ${x.pnl_cents > 0 ? 'WON' : 'LOST'} ${signedDollars(x.pnl_cents)}`
      : '';
  return {
    id: `exec-${x.id}`,
    at: x.created_at,
    level:
      x.status === 'rejected' ? 'err' : x.pnl_cents != null && x.pnl_cents <= 0 ? 'warn' : 'ok',
    text: `[${mode}] BET ${x.bet_number}/${MAX_BETS_PER_WINDOW} BUY ${x.side.toUpperCase()} ${shortTicker(x.ticker)} ${x.count}×${x.price_cents}¢ ${fill}${x.avg_fill_cents != null ? ` @${x.avg_fill_cents}¢` : ''} fee ${dollars(x.fee_cents)}${x.latency_ms != null ? ` ${x.latency_ms}ms` : ''}${settled}`,
  };
}

export function windowLine(w: MarketWindow): LogLine {
  const text =
    w.status === 'settled'
      ? `window ${shortTicker(w.ticker)} settled ${w.result?.toUpperCase() ?? '?'}${w.pnl_cents != null ? ` ${signedDollars(w.pnl_cents)}` : ''}`
      : w.status === 'closed'
        ? `window ${shortTicker(w.ticker)} closed, awaiting result`
        : `window ${shortTicker(w.ticker)} open${w.strike != null ? ` strike $${w.strike.toLocaleString('en-US')}` : ''} ${w.bets_placed}/${w.max_bets} bets`;
  return { id: `win-${w.id}-${w.status}`, at: w.updated_at ?? w.created_at, level: 'info', text };
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

/** Merges lines by id, newest last, capped. */
export function mergeLines(existing: LogLine[], incoming: LogLine[], keep = 300): LogLine[] {
  const byId = new Map(existing.map((l) => [l.id, l]));
  for (const l of incoming) byId.set(l.id, l);
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-keep);
}

// ---------------------------------------------------------------------------
// Status normalization
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
