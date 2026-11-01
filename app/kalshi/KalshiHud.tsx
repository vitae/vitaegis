'use client';

// /kalshi: the trading HUD. Rows stream from the Rust bot's tables over Supabase Realtime,
// the VPS is polled through /api/bot-status, and BTC/USD streams from Coinbase. Every
// number on screen comes from one of those three; nothing here is simulated.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  GBM_WEIGHT,
  MAX_BETS_PER_WINDOW,
  ML_WEIGHT,
  currentWindow,
  dollars,
  executionLine,
  isFresh,
  matrixFromSignal,
  mergeLines,
  pct,
  performance,
  realizedVol,
  shortTicker,
  signalLine,
  signedDollars,
  slotGlyphs,
  stakeOf,
  windowLine,
  windowTracker,
  type LogLine,
  type ModelMatrix,
  type TradeExecution,
} from '@/lib/kalshi-hud';
import { useCoinbaseTicker } from './useFeeds';
import { useBotStatus, useHudRows } from './useHudFeeds';
import styles from './hud.module.css';

const WINDOW_MS = 15 * 60_000;

const hms = (iso: string | number | null | undefined) =>
  iso == null
    ? '--:--:--'
    : new Date(iso).toLocaleTimeString('en-US', {
        timeZone: 'Pacific/Honolulu',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const usd = (n: number | null | undefined, digits = 2) =>
  n == null
    ? '—'
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const cents = (n: number | null | undefined) => (n == null ? '—' : `${n}¢`);
const tone = (n: number | null | undefined) =>
  n == null
    ? 'text-white/50'
    : n > 0
      ? 'text-vitae-green'
      : n < 0
        ? 'text-vitae-magenta'
        : 'text-white';

export default function KalshiHud() {
  const rows = useHudRows();
  const { status, error: statusError } = useBotStatus();
  const btc = useCoinbaseTicker('BTC-USD', 900);
  // 0 until mounted, so the server and the first client render agree.
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Which window we are in: the bot's word first, then its freshest signal, then the table.
  const freshSignal = rows.signals.find((s) => isFresh(s.created_at, now)) ?? null;
  const ticker =
    status?.ticker ??
    freshSignal?.ticker ??
    currentWindow(rows.windows, null, now)?.ticker ??
    status?.market?.ticker ??
    null;
  const win = currentWindow(rows.windows, ticker, now);
  const market =
    status?.market && (!ticker || status.market.ticker === ticker) ? status.market : null;
  const signal = rows.signals.find((s) => s.ticker === ticker) ?? null;
  const signalFresh = signal != null && isFresh(signal.created_at, now);

  const closeTime = win?.close_time ?? status?.closeTime ?? market?.closeTime ?? null;
  const closeMs = closeTime ? Date.parse(closeTime) : null;
  const openMs = win?.open_time
    ? Date.parse(win.open_time)
    : market?.openTime
      ? Date.parse(market.openTime)
      : closeMs != null
        ? closeMs - WINDOW_MS
        : null;
  const secondsLeft = closeMs != null ? Math.max(0, Math.round((closeMs - now) / 1000)) : null;
  const progress =
    closeMs != null && openMs != null
      ? Math.min(1, Math.max(0, (now - openMs) / (closeMs - openMs)))
      : 0;

  const strike = win?.strike ?? status?.strike ?? market?.strike ?? signal?.strike ?? null;
  const strikeType = win?.strike_type ?? market?.strikeType ?? null;
  const spot = btc.price ?? status?.spot ?? (signalFresh ? signal?.spot : null) ?? null;
  const yesAsk = (signalFresh ? signal?.yes_ask_cents : null) ?? market?.yesAsk ?? null;
  const noAsk = (signalFresh ? signal?.no_ask_cents : null) ?? market?.noAsk ?? null;

  const sigma = useMemo(() => realizedVol(btc.history), [btc.history]);
  const matrix = useMemo(
    () =>
      matrixFromSignal(
        signalFresh ? signal : null,
        { spot, strike, secondsToClose: secondsLeft, sigma, strikeType },
        { yesAsk, noAsk },
      ),
    [signal, signalFresh, spot, strike, secondsLeft, sigma, strikeType, yesAsk, noAsk],
  );

  const tracker = useMemo(() => windowTracker(rows.executions, ticker), [rows.executions, ticker]);
  const placed = Math.min(
    MAX_BETS_PER_WINDOW,
    Math.max(tracker.placed, win?.bets_placed ?? 0, status?.betsInWindow ?? 0),
  );
  const slots = Array.from({ length: MAX_BETS_PER_WINDOW }, (_, i) =>
    i < placed ? ('filled' as const) : ('open' as const),
  );
  const locked = placed >= MAX_BETS_PER_WINDOW;

  const perf = useMemo(() => performance(rows.executions, now), [rows.executions, now]);

  const lines = useMemo(
    () =>
      mergeLines(
        [],
        [
          ...rows.executions.slice(0, 60).map(executionLine),
          ...rows.signals.slice(0, 40).map(signalLine),
          ...rows.windows.slice(0, 10).map(windowLine),
          ...(status?.logs ?? []),
        ],
      ),
    [rows.executions, rows.signals, rows.windows, status?.logs],
  );

  // Connection pills.
  const botHeartbeat = signalFresh || isFresh(rows.signals[0]?.created_at, now);
  const vpsOn = status?.vps.ok === true || (!status?.vps.configured && botHeartbeat);
  const vpsLabel =
    status?.vps.ok === true
      ? `ONLINE${status.vps.latencyMs != null ? ` ${status.vps.latencyMs}ms` : ''}`
      : status?.vps.configured
        ? status.vps.detail?.toUpperCase() === 'TIMEOUT'
          ? 'TIMEOUT'
          : 'OFFLINE'
        : botHeartbeat
          ? 'HEARTBEAT'
          : status
            ? 'NO PROBE'
            : 'PROBING';
  const rtOn = rows.realtime === 'connected';
  const rtLabel =
    rows.realtime === 'connected'
      ? 'CONNECTED'
      : rows.realtime === 'connecting'
        ? 'CONNECTING'
        : rows.realtime === 'error'
          ? 'ERROR'
          : 'UNCONFIGURED';
  const wssOn = status?.kalshiWs === true || (signalFresh && signal?.kalshi_ws === true);
  const wssLabel = wssOn
    ? 'ACTIVE'
    : status?.kalshiWs === false || signal?.kalshi_ws === false
      ? 'DOWN'
      : 'UNKNOWN';
  const live = status?.live ?? (signalFresh ? signal?.live : null) ?? null;

  return (
    <main className={`${styles.hud} min-h-screen w-full text-left text-white`}>
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6">
        {/* Header & system status bar ------------------------------------- */}
        <header
          className={`${styles.panel} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
        >
          <div className="flex items-baseline gap-3">
            <span
              className={`${styles.glowGreen} text-lg font-bold tracking-[0.3em] text-vitae-green`}
            >
              VITAEGIS
            </span>
            <span className={`${styles.glowMagenta} text-xs tracking-[0.3em] text-vitae-magenta`}>
              KALSHI HUD
            </span>
            <span className="hidden text-[11px] text-white/40 sm:inline">
              KXBTC15M · 2-BET WINDOW RULE
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill on={vpsOn} label={`LIGHTSAIL VPS: ${vpsLabel}`} pulse={vpsOn} />
            <Pill on={rtOn} label={`SUPABASE REALTIME: ${rtLabel}`} pulse={rtOn} />
            <Pill on={wssOn} label={`KALSHI WSS: ${wssLabel}`} />
            <Pill
              on={live === true}
              label={live == null ? 'MODE: —' : live ? 'MODE: LIVE' : 'MODE: DRY RUN'}
              magenta={live === true}
            />
            <span className="text-white/40">{now ? hms(now) : '--:--:--'} HST</span>
          </div>
        </header>

        {(rows.error || statusError) && (
          <p className="mt-3 border border-vitae-magenta/40 bg-vitae-magenta/5 px-3 py-2 text-xs text-vitae-magenta">
            {rows.error || statusError}
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Active ticker card ------------------------------------------- */}
          <section className={`${styles.panel} p-4 lg:col-span-8`} aria-labelledby="ticker-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="ticker-heading" className="text-[11px] tracking-[0.3em] text-white/50">
                  ACTIVE 15-MIN TICKER
                </h2>
                <p className={`${styles.glowWhite} mt-1 text-xl font-semibold sm:text-2xl`}>
                  {ticker ?? 'KXBTC15M · waiting for a window'}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {win?.title ?? market?.title ?? 'BTC price up in next 15 mins?'}
                </p>
              </div>
              <Countdown seconds={secondsLeft} progress={progress} closeTime={closeTime} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat
                label="BTC SPOT"
                value={usd(spot)}
                valueClass={`${styles.glowWhite} ${btc.dir === 'up' ? styles.up : btc.dir === 'down' ? styles.down : ''}`}
                sub={
                  btc.connected
                    ? 'Coinbase · live'
                    : status?.spot != null
                      ? 'bot · last seen'
                      : 'connecting'
                }
              />
              <Stat
                label="STRIKE"
                value={usd(strike)}
                sub={strikeType ? strikeType.replace(/_/g, ' ') : 'Kalshi floor strike'}
              />
              <Stat
                label="SPOT − STRIKE"
                value={
                  spot != null && strike != null
                    ? `${spot - strike >= 0 ? '+' : '−'}${usd(Math.abs(spot - strike))}`
                    : '—'
                }
                valueClass={
                  spot != null && strike != null
                    ? spot >= strike
                      ? `${styles.glowGreen} text-vitae-green`
                      : `${styles.glowMagenta} text-vitae-magenta`
                    : ''
                }
                sub={
                  spot != null && strike != null
                    ? `${((Math.abs(spot - strike) / strike) * 100).toFixed(3)}% ${spot >= strike ? 'ABOVE' : 'BELOW'}`
                    : 'waiting for spot and strike'
                }
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
              <Quote side="YES" ask={yesAsk} hot={matrix.side === 'yes'} />
              <Quote side="NO" ask={noAsk} hot={matrix.side === 'no'} />
              <Sparkline history={btc.history} strike={strike} />
            </div>
            <p className="mt-3 text-[10px] text-white/35">
              {market
                ? `vol ${market.volume?.toLocaleString('en-US') ?? '—'} · OI ${market.openInterest?.toLocaleString('en-US') ?? '—'} · `
                : ''}
              book:{' '}
              {signalFresh
                ? `bot signal ${hms(signal?.created_at)}`
                : market
                  ? 'Kalshi public API'
                  : '—'}
            </p>
          </section>

          {/* Window execution tracker ------------------------------------- */}
          <section
            className={`${styles.panel} ${locked ? styles.panelLocked : placed > 0 ? styles.panelHot : ''} p-4 lg:col-span-4`}
            aria-labelledby="tracker-heading"
          >
            <h2 id="tracker-heading" className="text-[11px] tracking-[0.3em] text-white/50">
              WINDOW EXECUTION TRACKER
            </h2>
            <div className="mt-3 flex items-center justify-between">
              <div
                className="flex items-center gap-3"
                aria-label={`${placed} of ${MAX_BETS_PER_WINDOW} bets placed`}
              >
                {slots.map((s, i) => (
                  <span
                    key={i}
                    className={`${styles.slot} ${s === 'filled' ? (locked ? styles.slotLocked : styles.slotFilled) : ''} text-sm`}
                  >
                    {s === 'filled' ? '●' : '◯'}
                  </span>
                ))}
              </div>
              <span
                className={`text-2xl font-bold ${locked ? `${styles.glowMagenta} text-vitae-magenta` : `${styles.glowGreen} text-vitae-green`}`}
              >
                {slotGlyphs(slots)}
              </span>
            </div>
            <p className={`mt-3 text-sm ${locked ? 'text-vitae-magenta' : 'text-white'}`}>
              {locked
                ? `CIRCUIT BREAKER · ${MAX_BETS_PER_WINDOW}/${MAX_BETS_PER_WINDOW} BETS · LOCKED UNTIL NEXT WINDOW`
                : `BET ${placed + 1}/${MAX_BETS_PER_WINDOW} ARMED · ${MAX_BETS_PER_WINDOW - placed} SLOT${MAX_BETS_PER_WINDOW - placed === 1 ? '' : 'S'} OPEN`}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-white/45">Window</dt>
              <dd className="text-right">{shortTicker(ticker)}</dd>
              <dt className="text-white/45">Staked</dt>
              <dd className="text-right">{dollars(tracker.stakeCents)}</dd>
              <dt className="text-white/45">Window P&amp;L</dt>
              <dd className={`text-right ${tone(tracker.pnlCents)}`}>
                {tracker.pnlCents == null ? 'OPEN' : signedDollars(tracker.pnlCents)}
              </dd>
              <dt className="text-white/45">Closes</dt>
              <dd className="text-right">{hms(closeTime)}</dd>
            </dl>
          </section>

          {/* Model probability matrix ------------------------------------- */}
          <section className={`${styles.panel} p-4 lg:col-span-4`} aria-labelledby="matrix-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="matrix-heading" className="text-[11px] tracking-[0.3em] text-white/50">
                MODEL PROBABILITY MATRIX
              </h2>
              <span
                className={`text-[10px] ${matrix.source === 'bot' ? 'text-vitae-magenta' : 'text-white/40'}`}
              >
                {matrix.source === 'bot' ? 'BOT INFERENCE' : 'HUD GBM FALLBACK'}
              </span>
            </div>
            <Matrix m={matrix} />
          </section>

          {/* Live window trade log ---------------------------------------- */}
          <section className={`${styles.panel} p-4 lg:col-span-8`} aria-labelledby="log-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="log-heading" className="text-[11px] tracking-[0.3em] text-white/50">
                LIVE WINDOW TRADE LOG
              </h2>
              <span className="text-[10px] text-white/40">
                MAX {MAX_BETS_PER_WINDOW} BETS ENFORCED · {tracker.executions.length} ROW
                {tracker.executions.length === 1 ? '' : 'S'} THIS WINDOW
              </span>
            </div>
            <TradeTable executions={tracker.executions} />
          </section>

          {/* P&L strip ----------------------------------------------------- */}
          <section
            className={`${styles.panel} grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-6`}
            aria-label="Performance"
          >
            <Stat
              label="NET P&L"
              value={signedDollars(perf.netCents)}
              valueClass={`${tone(perf.netCents)} ${perf.netCents > 0 ? styles.glowGreen : ''}`}
              sub={`${perf.settled} settled`}
            />
            <Stat
              label="24H P&L"
              value={signedDollars(perf.net24hCents)}
              valueClass={tone(perf.net24hCents)}
              sub="settled today"
            />
            <Stat
              label="WIN RATE"
              value={pct(perf.winRate)}
              sub={`${perf.wins}/${perf.settled} wins`}
            />
            <Stat
              label="ROI"
              value={pct(perf.roi, 1)}
              valueClass={tone(perf.roi)}
              sub={`on ${dollars(perf.stakedCents)} staked`}
            />
            <Stat
              label="OPEN EXPOSURE"
              value={dollars(perf.openStakeCents)}
              sub={`${perf.open} open`}
            />
            <Stat
              label="BANKROLL"
              value={status?.bankrollCents != null ? dollars(status.bankrollCents) : 'PRIVATE'}
              valueClass={status?.bankrollCents != null ? styles.glowWhite : 'text-white/40'}
              sub={status?.bankrollCents != null ? 'from the bot' : 'set KALSHI_HUD_BALANCE=public'}
            />
          </section>

          {/* Terminal log stream ------------------------------------------ */}
          <section className="lg:col-span-12" aria-labelledby="terminal-heading">
            <Terminal lines={lines} connected={rtOn} />
          </section>
        </div>

        <p className="mt-6 text-[10px] text-white/35">
          Rows: Rust bot → Supabase (market_windows, bot_signals, trade_executions) → Realtime →
          this page. VPS: /api/bot-status → kalshi-bot.service. BTC/USD: Coinbase Exchange, direct.
          Times are Honolulu. Models: GBM {Math.round(GBM_WEIGHT * 100)}% + XGBoost{' '}
          {Math.round(ML_WEIGHT * 100)}%.{' '}
          <Link href="/kalshi/analytics" className="underline">
            Legacy analytics
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function Pill({
  on,
  label,
  pulse,
  magenta,
}: {
  on: boolean;
  label: string;
  pulse?: boolean;
  magenta?: boolean;
}) {
  const color = magenta
    ? 'border-vitae-magenta/60 text-vitae-magenta'
    : 'border-vitae-green/60 text-vitae-green';
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2 py-1 tracking-[0.15em] ${on ? color : 'border-white/15 text-white/45'}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${on ? (magenta ? styles.dotMagenta : styles.dotGreen) : styles.dotOff} ${pulse && on ? styles.pulse : ''}`}
        aria-hidden
      />
      [{label}]
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass = '',
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] tracking-[0.25em] text-white/45">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

function Countdown({
  seconds,
  progress,
  closeTime,
}: {
  seconds: number | null;
  progress: number;
  closeTime: string | null;
}) {
  const urgent = seconds != null && seconds <= 60;
  return (
    <div className="min-w-[160px] text-right">
      <p className="text-[10px] tracking-[0.25em] text-white/45">EXPIRES IN</p>
      <p
        className={`text-3xl font-bold ${seconds == null ? 'text-white/40' : urgent ? `${styles.glowMagenta} text-vitae-magenta` : `${styles.glowGreen} text-vitae-green`}`}
        aria-live="polite"
      >
        {seconds == null ? '--:--' : mmss(seconds)}
      </p>
      <div className={`${styles.bar} mt-1`} aria-hidden>
        <div
          className={`${styles.barFill} ${urgent ? styles.barMagenta : styles.barGreen}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-white/40">close {hms(closeTime)} HST</p>
    </div>
  );
}

function Quote({ side, ask, hot }: { side: 'YES' | 'NO'; ask: number | null; hot: boolean }) {
  return (
    <div
      className={`border px-3 py-2 ${hot ? `border-vitae-green bg-vitae-green/10 ${styles.panelHot}` : 'border-white/10 bg-white/[0.02]'}`}
      aria-label={`${side} ask ${cents(ask)}`}
    >
      <p className="text-[10px] tracking-[0.25em] text-white/45">{side} ASK</p>
      <p
        className={`mt-1 text-2xl font-semibold ${hot ? `${styles.glowGreen} text-vitae-green` : ''}`}
      >
        {cents(ask)}
      </p>
      <p className="text-[10px] text-white/40">
        {hot ? 'BUY SIGNAL' : ask != null ? `implied ${ask}%` : 'no quote'}
      </p>
    </div>
  );
}

function Sparkline({
  history,
  strike,
}: {
  history: { t: number; p: number }[];
  strike: number | null;
}) {
  const W = 320;
  const H = 64;
  const { path, strikeY, lo, hi } = useMemo(() => {
    if (history.length < 2) return { path: null, strikeY: null, lo: null, hi: null };
    const ps = history.map((h) => h.p);
    const lo = Math.min(...ps, strike ?? Infinity);
    const hi = Math.max(...ps, strike ?? -Infinity);
    const y = (p: number) => H - ((p - lo) / (hi - lo || 1)) * (H - 6) - 3;
    const path = history
      .map(
        (h, i) =>
          `${i ? 'L' : 'M'}${((i / (history.length - 1)) * W).toFixed(1)},${y(h.p).toFixed(1)}`,
      )
      .join('');
    return { path, strikeY: strike != null ? y(strike) : null, lo, hi };
  }, [history, strike]);
  const last = history[history.length - 1]?.p;
  const above = last != null && strike != null && last >= strike;
  return (
    <div className="border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex justify-between text-[10px] text-white/45">
        <span className="tracking-[0.25em]">BTC / USD · SPOT VS STRIKE</span>
        <span>{history.length} ticks</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="BTC spot against the strike"
      >
        {strikeY != null && (
          <line
            x1={0}
            x2={W}
            y1={strikeY}
            y2={strikeY}
            stroke="#ff00ff"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.8}
          />
        )}
        {path && (
          <path d={path} fill="none" stroke={above ? '#00ff00' : '#ffffff'} strokeWidth={1.5} />
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-white/35">
        <span>{lo != null ? usd(lo, 0) : '—'}</span>
        <span className="text-vitae-magenta/80">strike {usd(strike, 0)}</span>
        <span>{hi != null ? usd(hi, 0) : '—'}</span>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  color,
  mark,
  note,
}: {
  label: string;
  value: number | null;
  color: 'green' | 'magenta' | 'white';
  mark?: number | null;
  note?: string;
}) {
  const fill =
    color === 'green' ? styles.barGreen : color === 'magenta' ? styles.barMagenta : styles.barWhite;
  const text =
    color === 'green'
      ? 'text-vitae-green'
      : color === 'magenta'
        ? 'text-vitae-magenta'
        : 'text-white';
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className={`${text} font-semibold`}>{value == null ? '—' : pct(value, 1)}</span>
      </div>
      <div
        className={`${styles.bar} mt-1`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value == null ? undefined : Math.round(value * 100)}
        aria-label={label}
      >
        <div className={`${styles.barFill} ${fill}`} style={{ width: `${(value ?? 0) * 100}%` }} />
        {mark != null && (
          <div
            className={styles.barMark}
            style={{ left: `${mark * 100}%` }}
            title="Kalshi implied"
          />
        )}
      </div>
      {note && <p className="mt-0.5 text-[10px] text-white/35">{note}</p>}
    </div>
  );
}

function Matrix({ m }: { m: ModelMatrix }) {
  const signalText =
    m.side == null
      ? m.composite == null
        ? 'NO INFERENCE'
        : 'NO EDGE · HOLD'
      : `BUY ${m.side.toUpperCase()} · +${m.edgeCents?.toFixed(1)}¢ EDGE`;
  return (
    <div className="mt-3 space-y-3">
      <Bar
        label={`GBM · ${Math.round(GBM_WEIGHT * 100)}%`}
        value={m.gbm}
        color="white"
        mark={m.market}
        note={
          m.source === 'local'
            ? `σ ${m.sigma.toFixed(2)} ${m.sigmaSource === 'realized' ? 'realized' : 'default'}`
            : undefined
        }
      />
      <Bar
        label={`XGBOOST · ${Math.round(ML_WEIGHT * 100)}%`}
        value={m.ml}
        color="magenta"
        mark={m.market}
        note={m.ml == null ? 'no ML score in the latest signal' : undefined}
      />
      <Bar
        label="COMPOSITE P(YES)"
        value={m.composite}
        color="green"
        mark={m.market}
        note={m.market != null ? `white mark: Kalshi implied ${pct(m.market, 1)}` : undefined}
      />
      <div
        className={`border px-3 py-2 text-center text-sm font-bold tracking-[0.2em] ${m.side ? `border-vitae-green text-vitae-green ${styles.glowGreen}` : 'border-white/15 text-white/50'}`}
      >
        {signalText}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-white/45">Edge vs market</dt>
        <dd className={`text-right ${tone(m.edge)}`}>
          {m.edge == null
            ? '—'
            : `${m.edge >= 0 ? '+' : '−'}${(Math.abs(m.edge) * 100).toFixed(1)}pts`}
        </dd>
        <dt className="text-white/45">Kelly fraction</dt>
        <dd className={`text-right ${m.kelly ? `text-vitae-magenta ${styles.glowMagenta}` : ''}`}>
          {m.kelly == null ? '—' : pct(m.kelly, 1)}
        </dd>
        <dt className="text-white/45">Kelly stake / $10</dt>
        <dd className="text-right">{dollars(m.kellyStakeCents)}</dd>
      </dl>
    </div>
  );
}

function TradeTable({ executions }: { executions: TradeExecution[] }) {
  if (!executions.length) {
    return (
      <p className="mt-6 text-center text-xs text-white/40">
        NO ENTRIES THIS WINDOW · {MAX_BETS_PER_WINDOW}/{MAX_BETS_PER_WINDOW} SLOTS OPEN · WAITING
        FOR EDGE
      </p>
    );
  }
  const th = 'px-2 py-1 text-[10px] font-normal tracking-[0.2em] text-white/45';
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className={th}>BET</th>
            <th className={th}>TIME</th>
            <th className={th}>SIDE</th>
            <th className={`${th} text-right`}>ENTRY</th>
            <th className={`${th} text-right`}>QTY</th>
            <th className={`${th} text-right`}>STAKE</th>
            <th className={`${th} text-right`}>FEE</th>
            <th className={`${th} text-right`}>LAT</th>
            <th className={th}>STATUS</th>
            <th className={`${th} text-right`}>P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((x) => {
            const won = x.pnl_cents != null ? x.pnl_cents > 0 : null;
            const state =
              x.status === 'rejected'
                ? 'REJECTED'
                : x.pnl_cents != null
                  ? won
                    ? 'WON'
                    : 'LOST'
                  : x.status === 'dry_run'
                    ? 'DRY RUN'
                    : x.status === 'partial'
                      ? 'PARTIAL'
                      : 'OPEN';
            return (
              <tr key={x.id} className="border-b border-white/5">
                <td className="px-2 py-1.5 text-vitae-green">
                  {x.bet_number}/{MAX_BETS_PER_WINDOW}
                </td>
                <td className="px-2 py-1.5 text-white/70">{hms(x.created_at)}</td>
                <td
                  className={`px-2 py-1.5 font-semibold ${x.side === 'yes' ? 'text-vitae-green' : 'text-vitae-magenta'}`}
                >
                  {x.side.toUpperCase()}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {cents(x.avg_fill_cents ?? x.price_cents)}
                </td>
                <td className="px-2 py-1.5 text-right">{x.fill_count ?? x.count}</td>
                <td className="px-2 py-1.5 text-right">{dollars(stakeOf(x))}</td>
                <td className="px-2 py-1.5 text-right text-white/60">{dollars(x.fee_cents)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {x.latency_ms != null ? `${x.latency_ms}ms` : '—'}
                </td>
                <td
                  className={`px-2 py-1.5 ${state === 'WON' ? 'text-vitae-green' : state === 'LOST' || state === 'REJECTED' ? 'text-vitae-magenta' : 'text-white/70'}`}
                >
                  {state}
                </td>
                <td className={`px-2 py-1.5 text-right font-semibold ${tone(x.pnl_cents)}`}>
                  {x.pnl_cents == null ? '—' : signedDollars(x.pnl_cents)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Terminal({ lines, connected }: { lines: LogLine[]; connected: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lines, follow]);
  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  };
  const color = (l: LogLine['level']) =>
    l === 'ok'
      ? 'text-vitae-green'
      : l === 'err'
        ? 'text-vitae-magenta'
        : l === 'warn'
          ? 'text-vitae-magenta/80'
          : l === 'tick'
            ? 'text-white/40'
            : 'text-white/75';
  return (
    <div className={`${styles.terminal} p-3`}>
      <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-white/45">
        <span id="terminal-heading">LIVE TERMINAL LOG STREAM</span>
        <span className="flex items-center gap-3">
          <span className={connected ? 'text-vitae-green' : ''}>
            {connected ? '● STREAMING' : '○ SNAPSHOT'}
          </span>
          <button
            type="button"
            onClick={() => setFollow((f) => !f)}
            className={`border px-2 py-0.5 ${follow ? 'border-vitae-green/60 text-vitae-green' : 'border-white/20 text-white/50'}`}
          >
            FOLLOW {follow ? 'ON' : 'OFF'}
          </button>
        </span>
      </div>
      <div
        ref={box}
        onScroll={onScroll}
        className="mt-2 h-64 overflow-y-auto text-[11px] leading-5"
        role="log"
        aria-live="polite"
      >
        {lines.length === 0 && <p className="text-white/40">$ waiting for the bot…</p>}
        {lines.map((l) => (
          <p key={l.id} className={`whitespace-pre-wrap break-words ${color(l.level)}`}>
            <span className="text-white/30">{hms(l.at)}</span> {l.text}
          </p>
        ))}
        <p className="text-vitae-green">
          $<span className={styles.cursor} aria-hidden />
        </p>
      </div>
    </div>
  );
}
