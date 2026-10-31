'use client';

// /kalshi: the bot's market page. The snapshot comes from /api/kalshi once; after that
// every quote the bot sees arrives over Realtime and BTC/USD streams from Coinbase, so
// nothing here polls on a timer. Orders and settlements re-pull the snapshot.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MAX_ENTRY,
  MIN_ENTRY,
  dollars,
  entryZone,
  pct,
  signedDollars,
  type Backtest,
  type PublicSummary,
  type ThresholdRow,
  type TickPayload,
  type Trade,
} from '@/lib/kalshi';
import LineChart from './LineChart';
import { useCoinbaseTicker, useKalshiFeed } from './useFeeds';
import styles from './kalshi.module.css';

type Series = { t: number; yes: number | null; no: number | null }[];

const hst = (iso: string | number | null | undefined, seconds = false) =>
  iso == null
    ? '—'
    : new Date(iso).toLocaleString('en-US', {
        timeZone: 'Pacific/Honolulu',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        ...(seconds ? { second: '2-digit' } : {}),
      });
const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', {
    timeZone: 'Pacific/Honolulu',
    hour: 'numeric',
    minute: '2-digit',
  });
const cents = (n: number | null | undefined) => (n == null ? '—' : `${n}¢`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (n: number | null | undefined) =>
  n == null
    ? 'text-white/60'
    : n > 0
      ? 'text-vitae-green'
      : n < 0
        ? 'text-vitae-red'
        : 'text-white';

export default function KalshiBoard() {
  const [data, setData] = useState<PublicSummary | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState<TickPayload | null>(null);
  const [series, setSeries] = useState<Series>([]);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const refetchTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/kalshi', { cache: 'no-store' });
      const body = (await res.json()) as PublicSummary & { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
      setSeries((s) =>
        body.market && (!s.length || s[0].t < (body.market.series[0]?.t ?? 0))
          ? body.market.series
          : s.length
            ? s
            : (body.market?.series ?? []),
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the bot log.');
    }
  }, []);

  const scheduleReload = useCallback(() => {
    window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => void load(), 800);
  }, [load]);

  const joined = useKalshiFeed({
    onTick: (t) => {
      setLastTickAt(Date.now());
      setTick((prev) => {
        if (prev && prev.ticker !== t.ticker) {
          setSeries([{ t: t.ts_ms, yes: t.yes_ask_cents, no: t.no_ask_cents }]);
          scheduleReload();
        } else {
          setSeries((s) => [
            ...s.slice(-600),
            { t: t.ts_ms, yes: t.yes_ask_cents, no: t.no_ask_cents },
          ]);
        }
        return t;
      });
    },
    onEvent: () => scheduleReload(),
  });
  const btc = useCoinbaseTicker('BTC-USD');

  useEffect(() => {
    void load();
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(clockTimer);
      window.clearTimeout(refetchTimer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // The snapshot's market, overlaid with whatever has streamed in since.
  const market = useMemo(() => {
    const m = data?.market ?? null;
    if (tick && (!m || tick.ticker === m.ticker || Date.parse(m.closeTime ?? '') < tick.ts_ms)) {
      return {
        ticker: tick.ticker,
        title: tick.title ?? m?.title ?? tick.ticker,
        closeTime: tick.close_time,
        yesAsk: tick.yes_ask_cents,
        noAsk: tick.no_ask_cents,
        entry: entryZone(tick.yes_ask_cents, tick.no_ask_cents),
      };
    }
    return m;
  }, [data, tick]);

  const feedLive = lastTickAt != null && now - lastTickAt < 90_000;
  const botOnline = feedLive || (data?.online ?? false);
  const live = tick?.live ?? data?.live ?? null;
  const streaming = tick?.streaming ?? false;
  const secondsLeft = market?.closeTime
    ? Math.max(0, Math.round((Date.parse(market.closeTime) - now) / 1000))
    : null;

  const yesPoints = useMemo(
    () => series.filter((p) => p.yes != null).map((p) => ({ x: p.t, y: p.yes as number })),
    [series],
  );
  const open = yesPoints[0]?.y ?? null;

  return (
    <main className={`min-h-screen w-full bg-black text-left text-white ${styles.numeric}`}>
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        {/* Header ------------------------------------------------------------- */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green">
              Kalshi · Crypto · Bitcoin 15-minute
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
              {market?.title ?? 'Kalshi bot'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-light text-white/60">
              The Vitaegis bot buys the cheap side of each 15-minute Bitcoin market when the crowd
              leans hard the other way. This is its own log, live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Pill
              on={joined && feedLive}
              label={joined ? (feedLive ? 'Live feed' : 'Feed quiet') : 'Connecting'}
              pulse={joined && feedLive}
            />
            <Pill
              on={botOnline}
              label={botOnline ? (streaming ? 'Bot streaming' : 'Bot polling') : 'Bot offline'}
            />
            <Pill
              on={live === true}
              label={live == null ? 'Mode —' : live ? 'Live money' : 'Dry run'}
            />
          </div>
        </header>

        {error && <p className="mt-6 text-sm text-vitae-red">{error}</p>}

        {/* Market -------------------------------------------------------------- */}
        <section
          className="glass-panel mt-8 rounded-2xl p-4 sm:p-6"
          aria-labelledby="market-heading"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="market-heading"
                    className="text-sm uppercase tracking-[0.2em] text-white/50"
                  >
                    YES price
                  </h2>
                  <p className="mt-1 text-4xl font-semibold">{cents(market?.yesAsk)}</p>
                  {open != null && market?.yesAsk != null && (
                    <p className={`mt-1 text-sm ${tone(market.yesAsk - open)}`}>
                      {market.yesAsk - open >= 0 ? '+' : '−'}
                      {Math.abs(market.yesAsk - open)}¢ since the bot first saw this market
                    </p>
                  )}
                </div>
                <p className="text-sm text-white/60">
                  {market?.ticker ?? '—'}
                  {secondsLeft != null && (
                    <span className="ml-3 text-white">closes in {mmss(secondsLeft)}</span>
                  )}
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <LineChart
                  points={yesPoints}
                  yDomain={[0, 100]}
                  ariaLabel={`YES ask over the life of ${market?.ticker ?? 'the market'}`}
                  formatX={clock}
                  formatY={(y) => `${y}¢`}
                  tooltip={(i) => {
                    const p = series.filter((q) => q.yes != null)[i];
                    return {
                      title: hst(p.t, true),
                      rows: [
                        { label: 'YES ask', value: cents(p.yes) },
                        { label: 'NO ask', value: cents(p.no) },
                      ],
                    };
                  }}
                />
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Current asks">
                <Quote
                  side="Yes"
                  ask={market?.yesAsk ?? null}
                  hot={market?.entry?.outcome === 'yes'}
                />
                <Quote
                  side="No"
                  ask={market?.noAsk ?? null}
                  hot={market?.entry?.outcome === 'no'}
                />
              </div>
              <ZoneMeter yes={market?.yesAsk ?? null} no={market?.noAsk ?? null} />
              <BtcTile feed={btc} />
            </aside>
          </div>
        </section>

        {/* Performance --------------------------------------------------------- */}
        {data && (
          <>
            <Performance data={data} />
            <Thresholds backtest={data.backtest} />
            <Ledger trades={data.trades} />
            <Markets data={data} />
            {data.errors.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm uppercase tracking-[0.2em] text-vitae-red">Errors</h2>
                <ul className="mt-3 space-y-2">
                  {data.errors.map((e) => (
                    <li
                      key={e.at + e.message}
                      className="glass-panel flex justify-between gap-3 rounded-xl p-3 text-sm"
                    >
                      <span className="text-vitae-red">{e.message}</span>
                      <span className="shrink-0 text-xs text-white/40">{hst(e.at, true)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {!data && !error && <p className="mt-8 text-sm text-white/50">Loading…</p>}

        <p className="mt-12 text-xs text-white/35">
          Quotes: Kalshi WebSocket → bot → Supabase Realtime → this page. BTC/USD: Coinbase
          Exchange, direct. Times are Honolulu. Balance is only on the{' '}
          <Link href="/admin/kalshi" className="underline">
            admin screen
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
function Pill({ on, label, pulse }: { on: boolean; label: string; pulse?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${on ? 'border-vitae-green/50 text-white' : 'border-white/15 text-white/50'}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-vitae-green' : 'bg-white/30'} ${pulse ? styles.pulse : ''}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

function Quote({ side, ask, hot }: { side: string; ask: number | null; hot: boolean }) {
  const yes = side === 'Yes';
  return (
    <div
      className={`rounded-xl border p-3 ${
        hot
          ? 'border-vitae-green bg-vitae-green/15'
          : yes
            ? 'border-vitae-green/30 bg-vitae-green/5'
            : 'border-vitae-red/30 bg-vitae-red/5'
      }`}
      aria-label={`${side} ask ${cents(ask)}`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{side}</p>
      <p className="mt-1 text-3xl font-semibold">{cents(ask)}</p>
      <p className="mt-1 text-[11px] text-white/45">{hot ? 'in the entry zone' : 'ask'}</p>
    </div>
  );
}

/** Where the cheap side sits against the 8–28¢ zone the bot buys in. */
function ZoneMeter({ yes, no }: { yes: number | null; no: number | null }) {
  const cheap =
    yes != null && no != null
      ? yes <= no
        ? { side: 'YES', price: yes }
        : { side: 'NO', price: no }
      : null;
  const entry = entryZone(yes, no);
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">Entry zone</p>
      <div className="relative mt-3 h-2 rounded-full bg-white/10" aria-hidden>
        <div
          className="absolute inset-y-0 rounded-full bg-vitae-green/40"
          style={{ left: `${MIN_ENTRY}%`, width: `${MAX_ENTRY - MIN_ENTRY}%` }}
        />
        {cheap && (
          <div
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black ${entry ? 'bg-vitae-green' : 'bg-white'}`}
            style={{ left: `${cheap.price}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/40">
        <span>0¢</span>
        <span>
          {MIN_ENTRY}–{MAX_ENTRY}¢ buys
        </span>
        <span>100¢</span>
      </div>
      <p className={`mt-2 text-sm ${entry ? 'text-vitae-green' : 'text-white/60'}`}>
        {!cheap
          ? 'No two-sided book yet.'
          : entry
            ? `Buying ${entry.outcome.toUpperCase()} at ${entry.priceCents}¢: the crowd is ${100 - entry.priceCents}%+ the other way.`
            : `Cheap side is ${cheap.side} at ${cheap.price}¢ — above the ${MAX_ENTRY}¢ line, so the bot waits.`}
      </p>
    </div>
  );
}

function BtcTile({ feed }: { feed: ReturnType<typeof useCoinbaseTicker> }) {
  const hist = feed.history;
  const spark = useMemo(() => {
    if (hist.length < 2) return null;
    const lo = Math.min(...hist.map((h) => h.p));
    const hi = Math.max(...hist.map((h) => h.p));
    const w = 240;
    const hgt = 36;
    return hist
      .map(
        (h, i) =>
          `${i ? 'L' : 'M'}${((i / (hist.length - 1)) * w).toFixed(1)},${(hgt - ((h.p - lo) / (hi - lo || 1)) * (hgt - 4) - 2).toFixed(1)}`,
      )
      .join('');
  }, [hist]);
  const first = hist[0]?.p ?? null;
  const change = feed.price != null && first != null ? feed.price - first : null;
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">BTC / USD</p>
        <span className="flex items-center gap-1.5 text-[10px] text-white/45">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${feed.connected ? 'bg-vitae-green' : 'bg-white/30'} ${feed.connected ? styles.pulse : ''}`}
            aria-hidden
          />
          Coinbase
        </span>
      </div>
      <p
        key={feed.price ?? 'none'}
        className={`mt-1 text-3xl font-semibold ${feed.dir === 'up' ? styles.up : feed.dir === 'down' ? styles.down : ''}`}
      >
        {feed.price == null ? '—' : usd(feed.price)}
      </p>
      <p className={`mt-1 text-xs ${tone(change)}`}>
        {change == null
          ? 'waiting for the feed'
          : `${change >= 0 ? '+' : '−'}${usd(Math.abs(change))} since you opened this page`}
      </p>
      {spark && (
        <svg viewBox="0 0 240 36" className="mt-2 block h-9 w-full" aria-hidden>
          <path
            d={spark}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  toneClass = 'text-white',
}: {
  label: string;
  value: string;
  sub?: string;
  toneClass?: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${toneClass}`}
        style={{ fontVariantNumeric: 'normal' }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function Performance({ data }: { data: PublicSummary }) {
  const p = data.performance;
  const equity = p.equity.map((e, i) => ({ x: i + 1, y: e.cumCents / 100 }));
  return (
    <section className="mt-10" aria-labelledby="perf-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="perf-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
            Profitability
          </h2>
          <p
            className={`mt-2 text-5xl font-semibold ${tone(p.netCents)}`}
            style={{ fontVariantNumeric: 'normal' }}
          >
            {p.settled ? signedDollars(p.netCents) : '—'}
          </p>
          <p className="mt-1 text-sm text-white/50">
            net after fees over {p.settled} settled trade{p.settled === 1 ? '' : 's'}
            {p.open ? `, ${p.open} open` : ''}
          </p>
        </div>
        {p.winRate != null && p.breakevenWinRate != null && (
          <p className="max-w-sm text-sm text-white/60">
            At an average entry of {Math.round(p.avgEntryCents ?? 0)}¢ the bot has to win more than{' '}
            <span className="text-white">{pct(p.breakevenWinRate)}</span> of its trades to profit
            after fees. It is winning{' '}
            <span
              className={p.winRate > p.breakevenWinRate ? 'text-vitae-green' : 'text-vitae-red'}
            >
              {pct(p.winRate)}
            </span>
            .
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Win rate" value={pct(p.winRate)} sub={`${p.wins} of ${p.settled}`} />
        <Stat
          label="Return on stake"
          value={p.roi == null ? '—' : `${p.roi >= 0 ? '+' : '−'}${pct(Math.abs(p.roi))}`}
          sub={`${dollars(p.stakedCents)} staked`}
          toneClass={tone(p.roi)}
        />
        <Stat
          label="Avg entry"
          value={p.avgEntryCents == null ? '—' : `${Math.round(p.avgEntryCents)}¢`}
          sub="per contract"
        />
        <Stat
          label="Order latency"
          value={p.avgLatencyMs == null ? '—' : `${Math.round(p.avgLatencyMs)} ms`}
          sub="seen → acknowledged"
        />
        <Stat
          label="Entry timing"
          value={p.avgSecondsToClose == null ? '—' : mmss(Math.round(p.avgSecondsToClose))}
          sub="left on the clock"
        />
        <Stat
          label="Best / worst"
          value={p.best ? signedDollars(p.best.pnlCents) : '—'}
          sub={p.worst ? `${signedDollars(p.worst.pnlCents)} worst` : undefined}
          toneClass={tone(p.best?.pnlCents)}
        />
      </div>

      <div className="glass-panel mt-4 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
          Equity curve · cumulative P&amp;L per settled trade
        </p>
        <div className="mt-3">
          {equity.length ? (
            <LineChart
              points={equity}
              baseline={0}
              markers={equity.length <= 60}
              height={200}
              ariaLabel="Cumulative profit and loss after each settled trade"
              formatX={(x) => `#${x}`}
              formatY={(y) => `${y < 0 ? '−' : ''}$${Math.abs(y).toFixed(0)}`}
              tooltip={(i) => ({
                title: `Trade ${i + 1} · ${hst(p.equity[i].at)}`,
                rows: [{ label: 'running total', value: signedDollars(p.equity[i].cumCents) }],
              })}
            />
          ) : (
            <p className="py-10 text-center text-sm text-white/40">No settled trades yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Thresholds({ backtest }: { backtest: Backtest }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = backtest.rows;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.netCents)));
  const W = 720;
  const H = 160;
  const pad = { top: 10, bottom: 22, left: 44, right: 10 };
  const slot = (W - pad.left - pad.right) / rows.length;
  const bw = Math.min(24, slot * 0.6);
  const zero = pad.top + (H - pad.top - pad.bottom) / 2;
  const scale = (H - pad.top - pad.bottom) / 2 / maxAbs;

  const note = (() => {
    if (backtest.confidence === 'none') {
      return 'No settled markets recorded yet. Once the bot has watched a few dozen 15-minute markets through to settlement, this table shows what each entry line would have earned on the exact quotes it saw.';
    }
    const cur = backtest.current;
    const best = backtest.best;
    const n = `${backtest.markets} settled market${backtest.markets === 1 ? '' : 's'} (${backtest.confidence} confidence)`;
    if (!best || !cur) return `Over ${n}, no line produced five or more trades yet.`;
    if (best.maxEntry === cur.maxEntry) {
      return `Keep the line at ${cur.maxEntry}¢ (crowd at ${cur.heavy}%+). Over ${n} it was the most profitable ceiling: ${signedDollars(cur.netCents)} across ${cur.trades} trades.`;
    }
    return `Over ${n}, a ${best.maxEntry}¢ line (crowd at ${best.heavy}%+) would have made ${signedDollars(best.netCents)} on ${best.trades} trades, against ${signedDollars(cur.netCents)} on ${cur.trades} at the current ${cur.maxEntry}¢. ${
      backtest.confidence === 'low'
        ? 'Too few markets to act on yet; let it run.'
        : 'Worth moving the line.'
    }`;
  })();

  return (
    <section className="mt-10" aria-labelledby="thr-heading">
      <h2 id="thr-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
        Where should the line be?
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-white/60">
        Each row replays every settled market the bot watched with a different ceiling for the cheap
        side, at the same $10 a trade. “Crowd” is the other side’s price: a 30¢ line means buying
        when the market is 70% the other way, a 40¢ line means 60%.
      </p>

      <div className="glass-panel mt-4 rounded-2xl p-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Net P&L by entry ceiling"
          >
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={zero}
              y2={zero}
              stroke="#fff"
              strokeOpacity="0.3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={pad.left - 8}
              y={zero + 3}
              textAnchor="end"
              fontSize="10"
              fill="#fff"
              fillOpacity="0.45"
            >
              $0
            </text>
            {rows.map((r, i) => {
              const x = pad.left + slot * i + (slot - bw) / 2;
              const h = Math.abs(r.netCents) * scale;
              const up = r.netCents >= 0;
              const y = up ? zero - h : zero;
              const rr = Math.min(4, h);
              const d = up
                ? `M${x},${zero}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${zero}Z`
                : `M${x},${zero}V${zero + h - rr}Q${x},${zero + h} ${x + rr},${zero + h}H${x + bw - rr}Q${x + bw},${zero + h} ${x + bw},${zero + h - rr}V${zero}Z`;
              return (
                <g
                  key={r.maxEntry}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                >
                  <rect
                    x={pad.left + slot * i}
                    y={pad.top}
                    width={slot}
                    height={H - pad.top - pad.bottom}
                    fill="transparent"
                  />
                  {h > 0 && (
                    <path
                      d={d}
                      fill={r.current ? '#00ff00' : '#ffffff'}
                      fillOpacity={r.current ? 0.9 : hover === i ? 0.75 : 0.45}
                    />
                  )}
                  <text
                    x={x + bw / 2}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#fff"
                    fillOpacity={r.current ? 0.9 : 0.45}
                  >
                    {r.maxEntry}¢
                  </text>
                </g>
              );
            })}
          </svg>
          {hover != null && (
            <div
              className="pointer-events-none absolute top-1 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-xs backdrop-blur"
              style={{ left: `${((pad.left + slot * hover) / W) * 100}%` }}
            >
              <p className="text-white/50">
                {rows[hover].maxEntry}¢ line · crowd {rows[hover].heavy}%+
              </p>
              <p className="text-sm font-medium text-white">
                {signedDollars(rows[hover].netCents)}
              </p>
              <p className="text-white/60">
                {rows[hover].trades} trades · {pct(rows[hover].winRate)} won
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              <tr>
                <Th>Line</Th>
                <Th>Crowd</Th>
                <Th right>Trades</Th>
                <Th right>Won</Th>
                <Th right>Win rate</Th>
                <Th right>Avg entry</Th>
                <Th right>Staked</Th>
                <Th right>Net P&amp;L</Th>
                <Th right>Return</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: ThresholdRow) => (
                <tr
                  key={r.maxEntry}
                  className={`border-t border-white/10 ${r.current ? 'text-white' : 'text-white/75'}`}
                >
                  <Td>
                    ≤ {r.maxEntry}¢
                    {r.current && (
                      <span className="ml-2 rounded-full border border-vitae-green/50 px-2 py-0.5 text-[10px] text-vitae-green">
                        current
                      </span>
                    )}
                    {backtest.best?.maxEntry === r.maxEntry && !r.current && (
                      <span className="ml-2 rounded-full border border-white/30 px-2 py-0.5 text-[10px] text-white/70">
                        best
                      </span>
                    )}
                  </Td>
                  <Td>{r.heavy}%+</Td>
                  <Td right>{r.trades}</Td>
                  <Td right>{r.wins}</Td>
                  <Td right>{pct(r.winRate)}</Td>
                  <Td right>{r.avgEntryCents == null ? '—' : `${Math.round(r.avgEntryCents)}¢`}</Td>
                  <Td right>{dollars(r.stakedCents)}</Td>
                  <Td right className={tone(r.trades ? r.netCents : null)}>
                    {r.trades ? signedDollars(r.netCents) : '—'}
                  </Td>
                  <Td right className={tone(r.roi)}>
                    {r.roi == null ? '—' : `${r.roi >= 0 ? '+' : '−'}${pct(Math.abs(r.roi))}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-white/70">{note}</p>
      </div>
    </section>
  );
}

function Ledger({ trades }: { trades: Trade[] }) {
  return (
    <section className="mt-10" aria-labelledby="ledger-heading">
      <h2 id="ledger-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
        Every trade
      </h2>
      <div className="glass-panel mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            <tr>
              <Th>Placed</Th>
              <Th>Market</Th>
              <Th>Side</Th>
              <Th right>Asked</Th>
              <Th right>Paid</Th>
              <Th right>Filled</Th>
              <Th right>Stake</Th>
              <Th right>Fee</Th>
              <Th right>Max profit</Th>
              <Th right>Placed in</Th>
              <Th right>Clock left</Th>
              <Th>Result</Th>
              <Th right>P&amp;L</Th>
              <Th right>Return</Th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-6 text-center text-white/40">
                  No trades yet.
                </td>
              </tr>
            )}
            {trades.map((t) => (
              <tr key={t.id} className="border-t border-white/10 text-white/80">
                <Td>
                  <span className="text-white/50">{hst(t.at, true)}</span>
                  <span
                    className={`ml-2 text-[10px] uppercase tracking-[0.2em] ${t.live ? 'text-vitae-green' : 'text-white/40'}`}
                  >
                    {t.live ? 'live' : 'dry'}
                  </span>
                </Td>
                <Td>
                  <span className="text-white">{t.title}</span>
                  <span className="ml-2 text-xs text-white/40">{t.ticker}</span>
                </Td>
                <Td>
                  <span className={t.outcome === 'yes' ? 'text-vitae-green' : 'text-vitae-red'}>
                    {t.outcome.toUpperCase()}
                  </span>
                </Td>
                <Td right>{cents(t.askedCents)}</Td>
                <Td right>{cents(t.entryCents)}</Td>
                <Td right>
                  {t.contracts}
                  {t.contracts !== t.requested && (
                    <span className="text-white/40"> / {t.requested}</span>
                  )}
                </Td>
                <Td right>{dollars(t.stakeCents)}</Td>
                <Td right>{dollars(t.feeCents)}</Td>
                <Td right>{signedDollars(t.maxProfitCents)}</Td>
                <Td right>{t.latencyMs == null ? '—' : `${t.latencyMs} ms`}</Td>
                <Td right>{t.secondsToClose == null ? '—' : mmss(t.secondsToClose)}</Td>
                <Td>
                  {t.result ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${t.won ? 'border-vitae-green/50 text-vitae-green' : 'border-vitae-red/50 text-vitae-red'}`}
                    >
                      {t.result.toUpperCase()} · {t.won ? 'won' : 'lost'}
                    </span>
                  ) : (
                    <span className="text-white/40">open</span>
                  )}
                </Td>
                <Td right className={tone(t.pnlCents)}>
                  {t.pnlCents == null ? '—' : signedDollars(t.pnlCents)}
                </Td>
                <Td right className={tone(t.roi)}>
                  {t.roi == null ? '—' : `${t.roi >= 0 ? '+' : '−'}${pct(Math.abs(t.roi))}`}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Markets({ data }: { data: PublicSummary }) {
  return (
    <section className="mt-10" aria-labelledby="mk-heading">
      <h2 id="mk-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
        Recent markets
      </h2>
      {data.markets.length === 0 ? (
        <p className="glass-panel mt-4 rounded-2xl p-5 text-sm text-white/40">None settled yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.markets.map((m) => {
            const pnl = m.trades.reduce((a, t) => a + (t.pnlCents ?? 0), 0);
            return (
              <li key={m.ticker} className="glass-panel rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white">{m.title}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${m.result === 'yes' ? 'border-vitae-green/50 text-vitae-green' : 'border-vitae-red/50 text-vitae-red'}`}
                  >
                    {m.result.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 flex justify-between text-xs text-white/45">
                  <span>{hst(m.closeTime)}</span>
                  <span className={m.trades.length ? tone(pnl) : ''}>
                    {m.trades.length
                      ? `${m.trades.length} trade · ${signedDollars(pnl)}`
                      : 'sat out'}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`px-3 py-3 font-medium ${right ? 'text-right' : ''}`}>{children}</th>
);
const Td = ({
  children,
  right,
  className = '',
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) => (
  <td className={`whitespace-nowrap px-3 py-2 ${right ? 'text-right' : ''} ${className}`}>
    {children}
  </td>
);
