// KALSHIRUST: pure reducers over the Rust bot's telemetry (kalshirust_events) for /kalshirust.

export type RustMode = 'NORMAL' | 'RISK';
export type RustSide = 'yes' | 'no';
export type RustSource = 'bot' | 'sniper' | 'ufc' | 'shadow';
export type RustEventSource = RustSource | 'backtest';
export type StrikeType = 'greater' | 'less' | 'between' | 'greater_or_equal';

export type DesiredState = 'running' | 'stopped';

export interface KalshirustConfig {
  id: number;
  mode: RustMode;
  updated_at: string;
  desired_state: DesiredState;
  command_at: string | null;
  host_name: string | null;
  host_status: string | null;
  host_seen_at: string | null;
  bot_started_at?: string | null;
}

/** The slice of kalshirust_config the host pill and the RUN / STOP button read, as /api/kalshirust names it. */
export interface HostConfig {
  desiredState: DesiredState;
  hostStatus: string | null;
  hostSeenAt: string | null;
}

/** What the page says about the host: the supervisor's last report, read against desired_state. */
export type HostState = 'offline' | 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

export interface KalshirustEvent {
  id: string;
  created_at: string;
  kind: 'status' | 'signal' | 'settle' | 'error' | 'watch' | 'reconcile';
  source: RustEventSource;
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

export interface Prediction {
  side: RustSide | null;
  priceCents: number | null;
  count: number | null;
  costCents: number | null;
  feeCents: number | null;
  modelProb: number | null;
  edgeCents: number | null;
  /** Model probability that the entered side wins. */
  pWin: number | null;
  /** The market's implied probability of the entered side: price / 100. */
  marketPWin: number | null;
  /** Expected profit for the whole position after fee: edge × count. */
  evCents: number | null;
  /** Payout if the side wins, after fee. */
  maxWinCents: number | null;
}

/** Which of the bot's entry slots took a trade, from its order id prefix. */
export type TradeSlot = 'anytime' | 'sharp' | 'last90' | 'other';

/** KXBTC15M-26NOV041430-30 reads as "BTC 14:30 ET"; other tickers are returned as they are. */
export function shortTicker(ticker: string): string {
  const m = /^KX([A-Z]+)15M-\d{2}[A-Z]{3}\d{2}(\d{2})(\d{2})-\d{2}$/.exec(ticker);
  return m ? `${m[1]} ${m[2]}:${m[3]} ET` : ticker;
}

export function tradeSlot(clientOrderId: string | null | undefined): TradeSlot {
  if (clientOrderId?.startsWith('anytime-')) return 'anytime';
  if (clientOrderId?.startsWith('sharp-')) return 'sharp';
  if (clientOrderId?.startsWith('settle-')) return 'last90';
  return 'other';
}

export interface Trade extends Prediction {
  id: string;
  slot: TradeSlot;
  at: string;
  ticker: string | null;
  source: RustSource;
  mode: string | null;
  live: boolean;
  closeTime: string | null;
  /** The signal row's seconds before close when the order was placed. */
  secondsToClose: number | null;
  /** Seconds after the 15-minute window opened when the bot entered; null for the sniper or other series. */
  enteredAfterOpenSecs: number | null;
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
  /** Model probability that the bot's side wins. */
  pWin: number | null;
  priceCents: number | null;
  edgeCents: number | null;
  /** The highest price at which the win chance still clears the edge bar after the fee. */
  maxBuyCents: number | null;
  /** Expected profit on the snipe stake at the current price, after fee. */
  expectedProfitCents: number | null;
  /** The bot's explanation: trend, entry price and projection. */
  note: string | null;
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

export interface WindowRow {
  ticker: string;
  closedAt: string;
  settled: number | null;
  strike: number | null;
  outcome: 'YES' | 'NO' | null;
  trades: number;
  /** When each bot trade on the window was placed, seconds after it opened, oldest first. */
  enteredAfterOpenSecs: number[];
  /** Settled bot P&L on the window; null while any of its trades is pending. */
  pnlCents: number | null;
  /** true when every trade settled and won, false when any lost, null when none or still pending. */
  hit: boolean | null;
}

/** Every 15-minute window the bot watched to its close, traded or not. */
export interface Windows {
  observed: number;
  traded: number;
  settledPnlCents: number;
  perWindowCents: number | null;
  projectedDayCents: number | null;
  settledTrades: number;
  avgProfitPerTradeCents: number | null;
  target: { normalCents: number; riskCents: number };
  rows: WindowRow[];
}

/** The bot's latest comparison of Kalshi's own records with its trade book. */
export interface ExchangeCheck {
  at: string;
  fills: number;
  settledMarkets: number;
  wins: number;
  losses: number;
  costCents: number;
  feesCents: number;
  netCents: number;
  netTodayCents: number;
  bookSettled: number;
  bookNetCents: number;
  openTickers: string[];
  problems: string[];
  matches: boolean;
}

export function exchangeCheck(e: KalshirustEvent | undefined): ExchangeCheck | null {
  if (!e?.message) return null;
  try {
    const r = JSON.parse(e.message) as Record<string, unknown>;
    const dollars = (key: string) => Math.round((Number(r[key]) || 0) * 100);
    const count = (key: string) => Number(r[key]) || 0;
    const list = (key: string) => (Array.isArray(r[key]) ? (r[key] as unknown[]).map(String) : []);
    const problems = list('problems');
    return {
      at: e.created_at,
      fills: count('fills'),
      settledMarkets: count('settled_markets'),
      wins: count('wins'),
      losses: count('losses'),
      costCents: dollars('cost'),
      feesCents: dollars('fees'),
      netCents: dollars('net'),
      netTodayCents: dollars('net_today'),
      bookSettled: count('book_settled'),
      bookNetCents: dollars('book_net'),
      openTickers: list('open_tickers'),
      problems,
      matches: problems.length === 0,
    };
  } catch {
    return null;
  }
}

export interface Summary {
  status: KalshirustEvent | null;
  online: boolean;
  trades: Trade[];
  totals: Totals & {
    bySource: Record<RustSource, Totals>;
    bySlot: Record<'anytime' | 'sharp' | 'last90', Totals>;
    /** Real-money trades only: what the total loss stop watches. */
    live: Totals;
  };
  /** The bot's status line once the live run has lost the total limit, until it is live again. */
  liveStop: string | null;
  windows: Windows;
  watchlist: WatchRow[];
  history: HistoryPoint[];
  errors: { at: string; message: string }[];
  exchange: ExchangeCheck | null;
}

export interface BacktestTrade extends Prediction {
  id: string;
  at: string;
  ticker: string | null;
  result: RustSide | null;
  pnlCents: number | null;
  note: string | null;
}

export type PriceBucket = '15–30¢' | '30–50¢' | '50–70¢' | '70–85¢';

export interface BacktestSummary {
  trades: BacktestTrade[];
  totals: {
    trades: number;
    wins: number;
    losses: number;
    hitRate: number | null;
    riskedCents: number;
    pnlCents: number;
    roi: number | null;
    avgEdgeCents: number | null;
    avgPnlCents: number | null;
  };
  equity: number[];
  byPriceBucket: { bucket: PriceBucket; trades: number; wins: number; pnlCents: number }[];
  ranAt: string | null;
}

export const OFFLINE_AFTER_MS = 90_000;
/** The supervisor and the bot each write host_seen_at every 10 s while they run. */
export const HOST_OFFLINE_AFTER_MS = 45_000;
export const HISTORY_POINTS = 120;
export const WATCH_WINDOW_MS = 10 * 60_000;
export const WATCH_LIMIT = 15;
export const WINDOW_SECS = 15 * 60;
export const WINDOWS_PER_DAY = 96;
/** The goal: at least $1 per window in NORMAL, $3 in RISK. */
/** The goal for average profit per settled trade. */
export const TRADE_TARGET_CENTS = { normalCents: 20, riskCents: 300 };
export const SNIPE_EDGE_CENTS = 3;
/** The live run's loss that turns the bot to paper (TOTAL_LOSS_LIMIT_DOLLARS on the VPS). */
export const TOTAL_LOSS_LIMIT_CENTS = 3000;
/** The bot's status message once that stop has tripped starts with this. */
export const LIVE_STOP_PREFIX = 'Live trading stopped';
export const SNIPE_STAKE_CENTS = 500;
export const PRICE_BUCKETS: { bucket: PriceBucket; below: number }[] = [
  { bucket: '15–30¢', below: 30 },
  { bucket: '30–50¢', below: 50 },
  { bucket: '50–70¢', below: 70 },
  { bucket: '70–85¢', below: Infinity },
];

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

/** Kalshi's market page: series = ticker up to the first '-', event = ticker minus its last '-segment'. */
export function kalshiUrl(ticker: string): string {
  const series = ticker.split('-')[0];
  const cut = ticker.lastIndexOf('-');
  const event = cut > 0 ? ticker.slice(0, cut) : ticker;
  return `https://kalshi.com/markets/${series.toLowerCase()}/x/${event.toLowerCase()}`;
}

export function hostOnline(hostSeenAt: string | null | undefined, now = Date.now()): boolean {
  if (!hostSeenAt) return false;
  const seen = Date.parse(hostSeenAt);
  return Number.isFinite(seen) && now - seen < HOST_OFFLINE_AFTER_MS;
}

/** The command the host has not confirmed yet; the RUN / STOP button shows it as Starting… / Stopping…. */
export function pendingCommand(config: HostConfig): 'starting' | 'stopping' | null {
  const status = config.hostStatus;
  if (config.desiredState === 'running') return status === 'running' ? null : 'starting';
  return status === 'running' || status === 'starting' || status === 'stopping' ? 'stopping' : null;
}

export function hostState(config: HostConfig, now = Date.now()): HostState {
  if (!hostOnline(config.hostSeenAt, now)) return 'offline';
  const status = config.hostStatus ?? '';
  if (status.startsWith('error')) return 'error';
  if (status === 'starting' || status === 'stopping') return status;
  return pendingCommand(config) ?? (status === 'running' ? 'running' : 'stopped');
}

const HOST_LABELS: Record<Exclude<HostState, 'error'>, string> = {
  offline: 'VPS offline',
  running: 'Bot running',
  stopped: 'Bot stopped',
  starting: 'Starting…',
  stopping: 'Stopping…',
};

/** The host pill's text; an error is shown as the host reported it. */
export function hostLabel(config: HostConfig, now = Date.now()): string {
  const state = hostState(config, now);
  return state === 'error' ? (config.hostStatus as string) : HOST_LABELS[state];
}

/** The highest whole-cent price at which this win chance keeps the edge bar after the fee. */
export function maxBuyCents(
  pWin: number | null,
  minEdgeCents: number = SNIPE_EDGE_CENTS,
): number | null {
  if (pWin == null) return null;
  for (let c = 99; c >= 1; c--) {
    const price = c / 100;
    if ((pWin - price - 0.07 * price * (1 - price)) * 100 >= minEdgeCents) return c;
  }
  return null;
}

/** Expected profit on the snipe stake: whole contracts times the edge per contract. */
export function expectedProfitCents(
  priceCents: number | null,
  edgeCents: number | null,
): number | null {
  if (priceCents == null || priceCents <= 0 || edgeCents == null) return null;
  return Math.floor(SNIPE_STAKE_CENTS / priceCents) * edgeCents;
}

const sidePWin = (modelProb: number | null, side: RustSide | null) =>
  modelProb == null ? null : side === 'yes' ? modelProb : side === 'no' ? 1 - modelProb : null;

function prediction(e: KalshirustEvent): Prediction {
  const side = e.side;
  const priceCents = num(e.price_cents);
  const count = num(e.count);
  const feeCents = num(e.fee_cents);
  const modelProb = num(e.model_prob);
  const edgeCents = num(e.edge_cents);
  return {
    side,
    priceCents,
    count,
    costCents: num(e.cost_cents),
    feeCents,
    modelProb,
    edgeCents,
    pWin: sidePWin(modelProb, side),
    marketPWin: priceCents == null ? null : priceCents / 100,
    evCents: edgeCents == null || count == null ? null : edgeCents * count,
    maxWinCents:
      count == null || priceCents == null ? null : count * (100 - priceCents) - (feeCents ?? 0),
  };
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
  // One row per order: a signal posted twice (a retry, a restart) shows once.
  const seenOrders = new Set<string>();
  const trades: Trade[] = byTime
    .filter((e) => e.kind === 'signal')
    .filter((e) => {
      if (!e.client_order_id) return true;
      if (seenOrders.has(e.client_order_id)) return false;
      seenOrders.add(e.client_order_id);
      return true;
    })
    .map((e) => {
      const s = e.client_order_id ? settles.get(e.client_order_id) : undefined;
      const source: RustSource =
        e.source === 'sniper'
          ? 'sniper'
          : e.source === 'ufc'
            ? 'ufc'
            : e.source === 'shadow'
              ? 'shadow'
              : 'bot';
      const secondsToClose = num(e.seconds_to_close);
      return {
        id: e.id,
        slot: tradeSlot(e.client_order_id),
        at: e.created_at,
        ticker: e.ticker,
        source,
        mode: e.mode,
        live: e.live,
        closeTime: e.close_time,
        secondsToClose,
        enteredAfterOpenSecs:
          source === 'bot' && e.ticker?.startsWith('KXBTC15M') && secondsToClose != null
            ? WINDOW_SECS - secondsToClose
            : null,
        ...prediction(e),
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
      ufc: tally(trades.filter((t) => t.source === 'ufc')),
      shadow: tally(trades.filter((t) => t.source === 'shadow')),
    },
    bySlot: {
      anytime: tally(trades.filter((t) => t.slot === 'anytime')),
      sharp: tally(trades.filter((t) => t.slot === 'sharp')),
      last90: tally(trades.filter((t) => t.slot === 'last90')),
    },
    live: tally(trades.filter((t) => t.live)),
  };
  const lastLive = statuses.filter((e) => e.live).at(-1);
  const lastStop = statuses.filter((e) => (e.message ?? '').startsWith(LIVE_STOP_PREFIX)).at(-1);
  const liveStop =
    lastStop && (!lastLive || Date.parse(lastStop.created_at) >= Date.parse(lastLive.created_at))
      ? (lastStop.message as string)
      : null;

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
      pWin: sidePWin(num(e.model_prob), e.side),
      priceCents: num(e.price_cents),
      edgeCents: num(e.edge_cents),
      maxBuyCents: maxBuyCents(sidePWin(num(e.model_prob), e.side)),
      expectedProfitCents: expectedProfitCents(num(e.price_cents), num(e.edge_cents)),
      note: e.message,
      at: e.created_at,
    }))
    .filter((w) => w.side === 'yes')
    .sort((a, b) => (b.expectedProfitCents ?? -Infinity) - (a.expectedProfitCents ?? -Infinity))
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

  const windows = windowStats(byTime, trades);

  const exchange = exchangeCheck(byTime.filter((e) => e.kind === 'reconcile').at(-1));
  return { status, online, trades, totals, liveStop, windows, watchlist, history, errors, exchange };
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

/** The bot ends every 15-minute window with a zero-second status row whose message starts "settled ". */
const isWindowClose = (e: KalshirustEvent) =>
  e.kind === 'status' &&
  e.source === 'bot' &&
  e.ticker != null &&
  num(e.seconds_to_close) === 0 &&
  (e.message ?? '').startsWith('settled ');

function windowStats(byTime: KalshirustEvent[], trades: Trade[]): Windows {
  const closes = new Map<string, KalshirustEvent>();
  for (const e of byTime) {
    if (isWindowClose(e)) closes.set(e.ticker as string, e);
  }
  const onWindow = (t: Trade) => t.source === 'bot' && t.ticker != null && closes.has(t.ticker);
  const byTicker = new Map<string, Trade[]>();
  for (const t of [...trades].reverse()) {
    if (!onWindow(t)) continue;
    const ticker = t.ticker as string;
    byTicker.set(ticker, [...(byTicker.get(ticker) ?? []), t]);
  }
  const rows = [...closes.values()]
    .map((e): WindowRow => {
      const ticker = e.ticker as string;
      const ts = byTicker.get(ticker) ?? [];
      const settled = num(e.spot);
      const strike = num(e.strike);
      const pending = ts.some((t) => t.result == null);
      const lost = ts.some((t) => t.result != null && t.result !== t.side);
      return {
        ticker,
        closedAt: e.created_at,
        settled,
        strike,
        outcome: settled == null || strike == null ? null : settled >= strike ? 'YES' : 'NO',
        trades: ts.length,
        enteredAfterOpenSecs: ts
          .map((t) => t.enteredAfterOpenSecs)
          .filter((s): s is number => s != null),
        pnlCents: pending ? null : ts.reduce((a, t) => a + (t.pnlCents ?? 0), 0),
        hit: ts.length === 0 ? null : lost ? false : pending ? null : true,
      };
    })
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt));
  const settled = trades.filter((t) => onWindow(t) && t.result != null);
  const settledPnlCents = settled.reduce((a, t) => a + (t.pnlCents ?? 0), 0);
  const observed = closes.size;
  const perWindowCents = observed ? settledPnlCents / observed : null;
  return {
    observed,
    traded: rows.filter((r) => r.trades > 0).length,
    settledPnlCents,
    perWindowCents,
    projectedDayCents: perWindowCents == null ? null : perWindowCents * WINDOWS_PER_DAY,
    settledTrades: settled.length,
    avgProfitPerTradeCents: settled.length ? settledPnlCents / settled.length : null,
    target: TRADE_TARGET_CENTS,
    rows,
  };
}

/** Joins the backtester's signal and settle rows (source 'backtest') into one settled run, oldest first. */
export function summarizeBacktest(
  signals: KalshirustEvent[],
  settles: KalshirustEvent[],
): BacktestSummary {
  const settleByOrder = new Map<string, KalshirustEvent>();
  for (const s of settles) {
    if (s.kind === 'settle' && s.client_order_id) settleByOrder.set(s.client_order_id, s);
  }
  const trades: BacktestTrade[] = signals
    .filter((e) => e.kind === 'signal' && e.client_order_id && settleByOrder.has(e.client_order_id))
    .map((e) => {
      const s = settleByOrder.get(e.client_order_id as string) as KalshirustEvent;
      return {
        id: e.id,
        at: e.close_time ?? e.created_at,
        ticker: e.ticker,
        ...prediction(e),
        result: s.result,
        pnlCents: num(s.pnl_cents),
        note: e.message,
      };
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const isWin = (t: BacktestTrade) => t.result != null && t.result === t.side;
  const wins = trades.filter(isWin).length;
  const riskedCents = trades.reduce((a, t) => a + (t.costCents ?? 0) + (t.feeCents ?? 0), 0);
  const pnlCents = trades.reduce((a, t) => a + (t.pnlCents ?? 0), 0);
  const edges = trades.map((t) => t.edgeCents).filter((e): e is number => e != null);

  const equity: number[] = [];
  let running = 0;
  for (const t of trades) {
    running += t.pnlCents ?? 0;
    equity.push(running);
  }

  const byPriceBucket = PRICE_BUCKETS.map(({ bucket, below }, i) => {
    const floor = i === 0 ? -Infinity : PRICE_BUCKETS[i - 1].below;
    const rows = trades.filter(
      (t) => t.priceCents != null && t.priceCents >= floor && t.priceCents < below,
    );
    return {
      bucket,
      trades: rows.length,
      wins: rows.filter(isWin).length,
      pnlCents: rows.reduce((a, t) => a + (t.pnlCents ?? 0), 0),
    };
  });

  const ranAt = [...signals, ...settles].reduce<string | null>(
    (best, e) =>
      best == null || Date.parse(e.created_at) > Date.parse(best) ? e.created_at : best,
    null,
  );

  return {
    trades,
    totals: {
      trades: trades.length,
      wins,
      losses: trades.length - wins,
      hitRate: trades.length ? wins / trades.length : null,
      riskedCents,
      pnlCents,
      roi: riskedCents > 0 ? pnlCents / riskedCents : null,
      avgEdgeCents: edges.length ? edges.reduce((a, e) => a + e, 0) / edges.length : null,
      avgPnlCents: trades.length ? pnlCents / trades.length : null,
    },
    equity,
    byPriceBucket,
    ranAt,
  };
}

/** "up 1h 12m" style label for the running bot, or null without a start time. */
export function uptimeLabel(startedAt: string | null | undefined, now = Date.now()): string | null {
  if (!startedAt) return null;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started) || started > now) return null;
  const s = Math.floor((now - started) / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `up ${d}d ${h}h`;
  if (h > 0) return `up ${h}h ${m}m`;
  return `up ${m}m ${s % 60}s`;
}

/** Bot trades entered at or after the bot's start time. */
export function tradesSince(
  trades: { at: string; source: string }[],
  startedAt: string | null | undefined,
): number {
  if (!startedAt) return 0;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return 0;
  return trades.filter((t) => t.source === 'bot' && Date.parse(t.at) >= started).length;
}
