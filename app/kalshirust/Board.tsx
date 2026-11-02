'use client';

// /kalshirust: the Rust bot's page. Polls /api/kalshirust every 5 s. With the admin key from
// localStorage, RUN / STOP writes kalshirust_config.desired_state through /api/kalshirust/control
// (the host's supervisor does the rest) and RISK flips kalshirust_config.mode through /api/kalshirust/mode.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KEY_STORAGE } from '@/components/admin/AdminShell';
import {
  dollars,
  hostLabel,
  hostState,
  kalshiUrl,
  pendingCommand,
  signedDollars,
  WINDOW_SECS,
  WINDOWS_PER_DAY,
  type BacktestSummary,
  type BacktestTrade,
  type HostConfig,
  type Prediction,
  type RustMode,
  type Summary,
  type Trade,
  type WatchRow,
  type Totals,
  SNIPE_EDGE_CENTS,
  type Windows,
  tradesSince,
  uptimeLabel,
} from '@/lib/kalshirust';
import LineChart from '../kalshi/LineChart';
import kalshiStyles from '../kalshi/kalshi.module.css';
import styles from './kalshirust.module.css';

type Config = HostConfig & {
  mode: RustMode;
  updatedAt: string | null;
  commandAt: string | null;
  hostName: string | null;
  botStartedAt: string | null;
};

type Payload = Summary & {
  config: Config;
  backtest: BacktestSummary;
  generatedAt: string;
};

const EMPTY_CONFIG: Config = {
  mode: 'NORMAL',
  updatedAt: null,
  desiredState: 'stopped',
  commandAt: null,
  hostName: null,
  hostStatus: null,
  hostSeenAt: null,
  botStartedAt: null,
};

const POLL_MS = 5_000;
const TRADE_ROWS = 16;
const WINDOW_ROWS = 12;

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
const clockSeconds = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', {
    timeZone: 'Pacific/Honolulu',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const plusMmss = (s: number) => `+${mmss(s)}`;
const intoWindow = (secondsLeft: number) =>
  Math.min(WINDOW_SECS, Math.max(0, WINDOW_SECS - secondsLeft));
const countdown = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
    : mmss(s);
const cents = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : `${n.toFixed(digits)}¢`;
const pct = (x: number | null | undefined, digits = 0) =>
  x == null ? '—' : `${(x * 100).toFixed(digits)}%`;
const usd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (n: number | null | undefined) =>
  n == null
    ? 'text-white/60'
    : n > 0
      ? 'text-vitae-green'
      : n < 0
        ? 'text-vitae-red'
        : 'text-white';

const RESEARCH = [
  'Kalshi settles KXBTC15M on the 60-second average of CF Benchmarks’ BRTI before close vs before open; ties resolve YES. Coinbase spot is a proxy.',
  'Taker fee = 0.07 × count × P × (1−P) per contract, max 1.75¢ at 50¢. No maker fee on this series. The fee is the dominant cost and flips most small-edge strategies negative.',
  'Two independent ~6,000-window studies found buying the favorite at the ask is about +0.7¢ gross and negative after fees at every entry time.',
  'The market is slightly over-confident 2–3 minutes before close (calibration slope ~0.91); that is the only documented pocket of mispricing, and it is small.',
  'Driftless GBM with live realized vol, clamped to 10–90%, is the standard model; clamping improved Brier score in 9 of 9 walk-forward folds in one study.',
  'No public bot has verifiable live profits. This bot gates every entry on fee-adjusted edge and reports P&L after fees so the edge is measured, not assumed.',
];

export default function Board() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/kalshirust', { cache: 'no-store' });
      const body = (await res.json()) as Payload & { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the bot log.');
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clockTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const onChanged = useCallback(
    async (patch: Partial<Config>) => {
      setData((d) => (d ? { ...d, config: { ...d.config, ...patch } } : d));
      await load();
    },
    [load],
  );

  const status = data?.status ?? null;
  const online = data?.online ?? false;
  const config = data?.config ?? EMPTY_CONFIG;
  const mode = config.mode;
  const heartbeatAge =
    status && data ? Math.max(0, Math.round((now - Date.parse(status.created_at)) / 1000)) : null;
  const secondsLeft =
    online && status?.close_time
      ? Math.max(0, Math.round((Date.parse(status.close_time) - now) / 1000))
      : null;

  return (
    <main className={`min-h-screen w-full bg-black text-left text-white ${kalshiStyles.numeric}`}>
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green">
              Kalshi · KXBTC15M · Rust
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">KALSHIRUST</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Pill
                on={online}
                pulse={online}
                label={
                  online
                    ? `Online · ${heartbeatAge ?? 0}s`
                    : heartbeatAge == null
                      ? 'Offline'
                      : `Offline · ${heartbeatAge < 3600 ? `${heartbeatAge}s` : hst(status?.created_at)}`
                }
              />
              <Pill
                on={online}
                pulse={online && status?.live === true}
                tone={mode === 'RISK' ? 'red' : 'green'}
                label={mode}
                detail={online ? (status?.live ? 'trading' : 'paper') : undefined}
              />
              <Pill
                on={status?.live === true}
                label={status ? (status.live ? 'Live' : 'Paper') : 'Paper / Live —'}
              />
              <HostPill
                config={data ? data.config : null}
                now={now}
                trades={data ? data.trades : []}
              />
            </div>
          </div>
          <Controls config={config} onChanged={onChanged} />
        </header>

        {error && <p className="mt-6 text-sm text-vitae-red">{error}</p>}

        {data && <PerWindow windows={data.windows} mode={mode} />}
        <NowPanel status={online ? status : null} secondsLeft={secondsLeft} />

        {data && (
          <>
            <SnipeList rows={data.watchlist} now={now} />
            <Charts history={data.history} />
            <Trades trades={data.trades} totals={data.totals} now={now} />
            <Backtest backtest={data.backtest} />
            <Research />
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
          Bot → Supabase → this page, refreshed every 5 s. Times are Honolulu.
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
const PILL_TONES = {
  green: { ring: 'border-vitae-green/50 text-white', dot: 'bg-vitae-green' },
  red: { ring: 'border-vitae-red/60 text-white', dot: 'bg-vitae-red' },
  amber: { ring: 'border-amber-400/60 text-white', dot: 'bg-amber-400' },
};

function Pill({
  on,
  label,
  detail,
  pulse,
  tone = 'green',
}: {
  on: boolean;
  label: string;
  /** Muted text after the label. */
  detail?: string;
  pulse?: boolean;
  tone?: keyof typeof PILL_TONES;
}) {
  const { ring, dot } = PILL_TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${on ? ring : 'border-white/15 text-white/50'}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${on ? dot : 'bg-white/30'} ${pulse ? kalshiStyles.pulse : ''}`}
        aria-hidden
      />
      {label}
      {detail && <span className="text-white/40">{detail}</span>}
    </span>
  );
}

function HostPill({
  config,
  now,
  trades,
}: {
  config: Config | null;
  now: number;
  trades: { at: string; source: string }[];
}) {
  if (!config) return <Pill on={false} label="VPS —" />;
  const state = hostState(config, now);
  const running = state === 'running';
  const uptime = running ? uptimeLabel(config.botStartedAt, now) : null;
  const made = running ? tradesSince(trades, config.botStartedAt) : null;
  const seenAgo = config.hostSeenAt
    ? Math.max(0, Math.round((now - Date.parse(config.hostSeenAt)) / 1000))
    : null;
  const detail = [
    config.hostName,
    uptime,
    made == null ? null : `${made} trade${made === 1 ? '' : 's'}`,
    seenAgo == null ? null : `seen ${seenAgo < 3600 ? `${seenAgo}s ago` : hst(config.hostSeenAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pill
      on={state !== 'stopped'}
      tone={
        state === 'running'
          ? 'green'
          : state === 'starting' || state === 'stopping'
            ? 'amber'
            : 'red'
      }
      label={hostLabel(config, now)}
      detail={detail || undefined}
    />
  );
}

type AdminCall = 'mode' | 'control';

/** The RUN / STOP and RISK buttons, sharing one admin key and one inline prompt for it. */
function Controls({
  config,
  onChanged,
}: {
  config: Config;
  onChanged: (patch: Partial<Config>) => Promise<void>;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [armed, setArmed] = useState<AdminCall | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      setKey(localStorage.getItem(KEY_STORAGE));
    } catch {
      /* private mode */
    }
  }, []);

  const risk = config.mode === 'RISK';
  const running = config.desiredState === 'running';
  const command = pendingCommand(config);
  const calls: Record<AdminCall, { path: string; body: object; patch: Partial<Config> }> = {
    mode: {
      path: '/api/kalshirust/mode',
      body: { mode: risk ? 'NORMAL' : 'RISK' },
      patch: { mode: risk ? 'NORMAL' : 'RISK' },
    },
    control: {
      path: '/api/kalshirust/control',
      body: { action: running ? 'stop' : 'run' },
      patch: { desiredState: running ? 'stopped' : 'running' },
    },
  };

  const send = async (which: AdminCall, k: string) => {
    const { path, body, patch } = calls[which];
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': k },
        body: JSON.stringify(body),
      });
      const reply = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 403) setKey(null);
        throw new Error(
          res.status === 403 ? 'Admin key rejected (403)' : reply.error || `HTTP ${res.status}`,
        );
      }
      setKey(k);
      setArmed(null);
      setDraft('');
      try {
        localStorage.setItem(KEY_STORAGE, k);
      } catch {
        /* private mode */
      }
      await onChanged(patch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };
  const act = (which: AdminCall) => (key ? void send(which, key) : setArmed(which));

  const runLabel =
    command === 'starting'
      ? 'Starting…'
      : command === 'stopping'
        ? 'Stopping…'
        : running
          ? 'STOP'
          : 'RUN';
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => act('control')}
          aria-busy={command != null}
          className={`inline-flex items-center justify-center gap-3 rounded-2xl border-2 px-8 py-4 text-2xl font-bold transition disabled:opacity-60 ${
            running
              ? 'border-vitae-red bg-vitae-red/10 text-vitae-red hover:bg-vitae-red hover:text-white'
              : 'border-green-600 bg-green-600 text-white hover:border-green-500 hover:bg-green-500'
          } ${command ? styles.pending : 'tracking-[0.2em]'}`}
        >
          {command && <span className={styles.spinner} aria-hidden />}
          {runLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act('mode')}
          aria-pressed={risk}
          className={`rounded-2xl px-8 py-4 text-2xl font-bold uppercase tracking-[0.2em] transition disabled:opacity-60 ${
            risk
              ? `bg-vitae-red text-white ${styles.riskOn}`
              : 'border-2 border-vitae-red bg-vitae-red/10 text-vitae-red hover:bg-vitae-red hover:text-white'
          }`}
        >
          {risk ? 'RISK ON' : 'RISK'}
        </button>
      </div>
      {armed && !key && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void send(armed, draft.trim());
          }}
        >
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="admin key"
            aria-label="Admin key"
            className="w-40 rounded-lg border border-white/20 bg-black px-3 py-1.5 text-sm text-white outline-none focus:border-vitae-red"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Set
          </button>
        </form>
      )}
      {err && <p className="text-xs text-vitae-red">{err}</p>}
      <p className="max-w-xs text-[11px] leading-snug text-white/45 sm:text-right">
        RUN starts the bot on the VPS; STOP sends it a clean shutdown. Changes take up to 10 s.
      </p>
      <p className="max-w-xs text-[11px] leading-snug text-white/45 sm:text-right">
        NORMAL: 1 trade a window at $5, needing a 75%+ win chance. First choice, after the first 9
        min, from 5 to 2 min before close: after a 15¢+ move in a minute, buying the side that rose
        at 72–82¢. If none qualifies, the last 90 s: settlement math at 75%+, at 60¢ or less or at
        72–82¢, with the analytics engine agreeing. No trade unless expected profit after fees is
        positive. Live trading stops for the UTC day after a $30 loss. RISK: up to $100 a trade, as
        low as 60% in the last 90 s, plus earlier trades from 7 min out with no win-chance floor.
      </p>
    </div>
  );
}

function NowPanel({
  status,
  secondsLeft,
}: {
  status: Summary['status'];
  secondsLeft: number | null;
}) {
  const spot = status?.spot ?? null;
  const strike = status?.strike ?? null;
  const dist = spot != null && strike != null && strike !== 0 ? (spot - strike) / strike : null;
  const yesAsk = status?.yes_ask_cents ?? null;
  const prob = status?.model_prob ?? null;
  const distText =
    dist == null ? '' : `${dist >= 0 ? '+' : '−'}${(Math.abs(dist) * 100).toFixed(3)}% vs strike`;
  const closeMs = status?.close_time ? Date.parse(status.close_time) : NaN;
  const tiles: { label: string; value: string; sub?: string; toneClass?: string; href?: string }[] =
    [
      {
        label: 'Market',
        value: status?.ticker ?? '—',
        sub:
          secondsLeft == null
            ? undefined
            : `closes in ${mmss(secondsLeft)} · ${plusMmss(intoWindow(secondsLeft))} into window`,
        href: status?.ticker ? kalshiUrl(status.ticker) : undefined,
      },
      { label: 'BTC spot', value: usd(spot), sub: distText || undefined, toneClass: tone(dist) },
      { label: 'Strike', value: usd(strike) },
      { label: 'Model P(UP)', value: pct(prob, 1) },
      { label: 'YES ask', value: cents(yesAsk), sub: 'market P(UP)' },
      {
        label: 'Edge',
        value:
          status?.edge_cents == null
            ? '—'
            : `${status.edge_cents >= 0 ? '+' : '−'}${Math.abs(status.edge_cents).toFixed(2)}¢`,
        sub: 'best side, after fee',
        toneClass: tone(status?.edge_cents),
      },
      { label: 'Realized vol', value: pct(status?.vol_window, 3), sub: 'over the window' },
    ];
  return (
    <section className="mt-8" aria-labelledby="now-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="now-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
          Now
        </h2>
        {Number.isFinite(closeMs) && (
          <p className="text-xs text-white/45">
            Window opens {clockSeconds(closeMs - WINDOW_SECS * 1000)} HST · closes{' '}
            {clockSeconds(closeMs)} HST · settlement engine arms at +13:30
          </p>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {tiles.map((t) => (
          <Stat key={t.label} {...t} />
        ))}
      </div>
    </section>
  );
}

function PerWindow({ windows, mode }: { windows: Windows; mode: RustMode }) {
  const targetCents = mode === 'RISK' ? windows.target.riskCents : windows.target.normalCents;
  const met =
    windows.avgProfitPerTradeCents != null && windows.avgProfitPerTradeCents >= targetCents;
  const rows = windows.rows.slice(0, WINDOW_ROWS);
  return (
    <section className="mt-8" aria-labelledby="window-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="window-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
          Per window
        </h2>
        <p className="text-xs text-white/45">
          Every 15-minute window the bot watched to its close, traded or not. P&amp;L is its settled
          trades on that window, after fees.
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Windows observed" value={String(windows.observed)} />
        <Stat label="Windows traded" value={String(windows.traded)} />
        <Stat
          label="Net P&L"
          value={windows.observed ? signedDollars(windows.settledPnlCents) : '—'}
          sub="settled"
          toneClass={tone(windows.observed ? windows.settledPnlCents : null)}
        />
        <Stat
          label="Avg per window"
          value={signedDollars(windows.perWindowCents)}
          toneClass={tone(windows.perWindowCents)}
        />
        <Stat
          label="Projected per day"
          value={signedDollars(windows.projectedDayCents)}
          sub={`${WINDOWS_PER_DAY} windows a day`}
          toneClass={tone(windows.projectedDayCents)}
        />
        <Stat
          label="Avg profit per trade"
          value={signedDollars(windows.avgProfitPerTradeCents)}
          sub={`${windows.settledTrades} settled · goal ${dollars(targetCents)}+`}
          toneClass={tone(windows.avgProfitPerTradeCents)}
          badge={
            met && (
              <span className="ml-2 text-base text-vitae-green" aria-label="target met">
                ✓
              </span>
            )
          }
        />
      </div>
      <div className="glass-panel mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            <tr>
              <Th>Closed</Th>
              <Th>Ticker</Th>
              <Th right>Settled vs strike</Th>
              <Th>Outcome</Th>
              <Th right>Trades</Th>
              <Th>Entered</Th>
              <Th right>P&amp;L</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                  No windows closed yet.
                </td>
              </tr>
            )}
            {rows.map((w) => (
              <tr key={w.ticker} className="border-t border-white/10 text-white/80">
                <Td>
                  <span className="text-white/50">{hst(w.closedAt, true)}</span>
                </Td>
                <Td>
                  <TickerLink ticker={w.ticker} />
                </Td>
                <Td right>
                  {usd(w.settled)} <span className="text-white/40">vs</span> {usd(w.strike)}
                </Td>
                <Td>
                  <span
                    className={
                      w.outcome === 'YES'
                        ? 'text-vitae-green'
                        : w.outcome === 'NO'
                          ? 'text-vitae-red'
                          : 'text-white/40'
                    }
                  >
                    {w.outcome ?? '—'}
                  </span>
                </Td>
                <Td right>{w.trades}</Td>
                <Td>
                  {w.enteredAfterOpenSecs.length
                    ? w.enteredAfterOpenSecs.map(plusMmss).join(', ')
                    : '—'}
                </Td>
                <Td
                  right
                  className={
                    w.trades === 0 || w.pnlCents == null ? 'text-white/40' : tone(w.pnlCents)
                  }
                >
                  {w.trades === 0
                    ? '—'
                    : w.pnlCents == null
                      ? 'pending'
                      : signedDollars(w.pnlCents)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  toneClass = 'text-white',
  href,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  toneClass?: string;
  href?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p
        className={`mt-2 truncate text-2xl font-semibold ${toneClass}`}
        style={{ fontVariantNumeric: 'normal' }}
        title={value}
      >
        {href ? <ExternalLink href={href}>{value}</ExternalLink> : value}
        {badge}
      </p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="underline decoration-white/25 underline-offset-4 hover:decoration-vitae-green"
  >
    {children}
    <span className="ml-1 text-[0.7em] text-white/45" aria-hidden>
      ↗
    </span>
  </a>
);

const TickerLink = ({ ticker, className = '' }: { ticker: string | null; className?: string }) =>
  ticker ? (
    <span className={className}>
      <ExternalLink href={kalshiUrl(ticker)}>{ticker}</ExternalLink>
    </span>
  ) : (
    <span className={className}>—</span>
  );

const strikeRange = (w: WatchRow) => {
  const lo = w.strike == null ? null : usd(w.strike);
  const hi = w.capStrike == null ? null : usd(w.capStrike);
  switch (w.strikeType) {
    case 'greater':
      return lo ? `> ${lo}` : '—';
    case 'greater_or_equal':
      return lo ? `≥ ${lo}` : '—';
    case 'less':
      return (hi ?? lo) ? `< ${hi ?? lo}` : '—';
    case 'between':
      return lo && hi ? `${lo} – ${hi}` : (lo ?? hi ?? '—');
    default:
      return lo ?? hi ?? '—';
  }
};

function SnipeList({ rows, now }: { rows: WatchRow[]; now: number }) {
  return (
    <section className="mt-10" aria-labelledby="snipe-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="snipe-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
          Snipe list · YES picks
        </h2>
        <p className="max-w-2xl text-xs text-white/45">
          Every open Kalshi Bitcoin price market, scanned each minute. Listed only if YES keeps a
          75%+ win chance and {SNIPE_EDGE_CENTS}¢ of edge after fees at low, normal and high
          volatility, most expected profit first. These are model estimates, not guarantees. A
          projected entry assumes the recent BTC trend continues, which often fails. Paper trades
          only.
        </p>
      </div>
      <div className="glass-panel mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            <tr>
              <Th>Market and entry</Th>
              <Th right>Closes in</Th>
              <Th>Strike</Th>
              <Th right>BTC spot</Th>
              <Th right>YES ask</Th>
              <Th right>Buy up to</Th>
              <Th right>Win chance</Th>
              <Th right>Edge</Th>
              <Th right>Exp. profit on $5</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-white/40">
                  No YES picks clear the bar right now.
                </td>
              </tr>
            )}
            {rows.map((w) => {
              const left = w.closeTime
                ? Math.max(0, Math.round((Date.parse(w.closeTime) - now) / 1000))
                : w.secondsToClose;
              const hot = w.edgeCents != null && w.edgeCents >= SNIPE_EDGE_CENTS;
              return (
                <tr key={w.ticker} className="border-t border-white/10 text-white/80">
                  <Td>
                    <span className="text-white">{w.title ?? w.ticker}</span>
                    {w.subtitle && <span className="ml-2 text-xs text-white/45">{w.subtitle}</span>}
                    <TickerLink ticker={w.ticker} className="ml-2 text-[10px] text-white/50" />
                    {w.note && (
                      <p className="mt-1 max-w-xl text-xs leading-snug text-white/55">{w.note}</p>
                    )}
                    <p className="mt-1 text-[10px] text-white/40">
                      Re-checks in {Math.max(0, 60 - Math.round((now - Date.parse(w.at)) / 1000))} s
                    </p>
                  </Td>
                  <Td right>{left == null ? '—' : countdown(left)}</Td>
                  <Td>{strikeRange(w)}</Td>
                  <Td right>{usd(w.spot)}</Td>
                  <Td right>{cents(w.yesAskCents)}</Td>
                  <Td right className="font-semibold">
                    {cents(w.maxBuyCents)}
                  </Td>
                  <Td right className="font-semibold">
                    {pct(w.pWin, 1)}
                  </Td>
                  <Td right className={hot ? 'font-semibold text-vitae-green' : tone(w.edgeCents)}>
                    {cents(w.edgeCents, 2)}
                  </Td>
                  <Td right className={tone(w.expectedProfitCents)}>
                    {signedDollars(w.expectedProfitCents)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Charts({ history }: { history: Summary['history'] }) {
  const model = useMemo(
    () =>
      history
        .filter((h) => h.modelProb != null)
        .map((h) => ({ x: h.t, y: Math.round((h.modelProb as number) * 1000) / 10 })),
    [history],
  );
  const market = useMemo(
    () =>
      history
        .filter((h) => h.yesAskCents != null)
        .map((h) => ({ x: h.t, y: h.yesAskCents as number })),
    [history],
  );
  const modelRows = useMemo(() => history.filter((h) => h.modelProb != null), [history]);
  const marketRows = useMemo(() => history.filter((h) => h.yesAskCents != null), [history]);
  return (
    <section className="mt-10 grid gap-4 lg:grid-cols-2" aria-label="Model against market">
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Model P(UP)</p>
        <div className="mt-3">
          <LineChart
            points={model}
            yDomain={[0, 100]}
            height={200}
            ariaLabel="Model probability of UP over recent heartbeats"
            formatX={clock}
            formatY={(y) => `${y}%`}
            tooltip={(i) => ({
              title: hst(modelRows[i].t, true),
              rows: [
                { label: 'model', value: pct(modelRows[i].modelProb, 1) },
                { label: 'YES ask', value: cents(modelRows[i].yesAskCents) },
              ],
            })}
          />
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Market YES ask</p>
        <div className="mt-3">
          <LineChart
            points={market}
            yDomain={[0, 100]}
            height={200}
            color="#ffffff"
            ariaLabel="YES ask over recent heartbeats"
            formatX={clock}
            formatY={(y) => `${y}¢`}
            tooltip={(i) => ({
              title: hst(marketRows[i].t, true),
              rows: [
                { label: 'YES ask', value: cents(marketRows[i].yesAskCents) },
                { label: 'model', value: pct(marketRows[i].modelProb, 1) },
              ],
            })}
          />
        </div>
      </div>
    </section>
  );
}

function SlotSummary({ label, totals }: { label: string; totals: Totals }) {
  return (
    <p>
      {label}: {totals.trades} trade{totals.trades === 1 ? '' : 's'},{' '}
      <span className={tone(totals.settled ? totals.pnlCents : null)}>
        {totals.settled ? signedDollars(totals.pnlCents) : '—'}
      </span>{' '}
      net, {pct(totals.hitRate)} hit rate
    </p>
  );
}

function Trades({
  trades,
  totals,
  now,
}: {
  trades: Trade[];
  totals: Summary['totals'];
  now: number;
}) {
  const allPaper = trades.length > 0 && trades.every((t) => !t.live);
  const sniper = totals.bySource.sniper;
  const rows = trades.slice(0, TRADE_ROWS);
  return (
    <section className="mt-10" aria-labelledby="trades-heading">
      <h2 id="trades-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
        {allPaper ? `${TRADE_ROWS} TRADE PAPER RUN` : `${TRADE_ROWS} TRADE RUN`}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Trades" value={String(totals.trades)} />
        <Stat label="Settled" value={String(totals.settled)} />
        <Stat label="Wins / losses" value={`${totals.wins} / ${totals.losses}`} />
        <Stat label="Hit rate" value={pct(totals.hitRate)} />
        <Stat label="Risked" value={dollars(totals.riskedCents)} />
        <Stat
          label="Net P&L"
          value={totals.settled ? signedDollars(totals.pnlCents) : '—'}
          toneClass={tone(totals.settled ? totals.pnlCents : null)}
        />
        <Stat
          label="ROI"
          value={
            totals.roi == null
              ? '—'
              : `${totals.roi >= 0 ? '+' : '−'}${pct(Math.abs(totals.roi), 1)}`
          }
          toneClass={tone(totals.roi)}
        />
      </div>
      {sniper.trades > 0 && (
        <p className="mt-3 text-sm text-white/60">
          Sniper: {sniper.trades} trade{sniper.trades === 1 ? '' : 's'},{' '}
          <span className={tone(sniper.settled ? sniper.pnlCents : null)}>
            {sniper.settled ? signedDollars(sniper.pnlCents) : '—'}
          </span>{' '}
          net, {pct(sniper.hitRate)} hit rate
        </p>
      )}
      {(totals.bySlot.anytime.trades > 0 || totals.bySlot.last90.trades > 0) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/60">
          <SlotSummary label="After 9 min" totals={totals.bySlot.anytime} />
          <SlotSummary label="Last 90 s" totals={totals.bySlot.last90} />
        </div>
      )}
      <div className="glass-panel mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1360px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            <tr>
              <Th>Time</Th>
              <Th>Slot</Th>
              <Th>Ticker</Th>
              <Th>Entered</Th>
              <PredictionHeads />
              <Th>Result</Th>
              <Th right>P&amp;L</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-6 text-center text-white/40">
                  No trades yet.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-white/10 text-white/80">
                <Td>
                  <span className="text-white/50">{hst(t.at, true)}</span>
                  <span
                    className={`ml-2 text-[10px] uppercase tracking-[0.2em] ${t.live ? 'text-vitae-green' : 'text-white/40'}`}
                  >
                    {t.live ? 'live' : 'paper'}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`text-[11px] uppercase tracking-[0.15em] ${t.source === 'sniper' ? 'text-vitae-cyan' : 'text-white/60'}`}
                  >
                    {t.slot === 'anytime'
                      ? 'after 9 min'
                      : t.slot === 'last90'
                        ? 'last 90 s'
                        : t.source}
                  </span>
                </Td>
                <Td>
                  <TickerLink ticker={t.ticker} />
                </Td>
                <Td>
                  {t.enteredAfterOpenSecs == null ? (
                    <span className="text-white/40">—</span>
                  ) : (
                    <>
                      {plusMmss(t.enteredAfterOpenSecs)}
                      <span className="ml-1 text-xs text-white/40">· {t.secondsToClose}s left</span>
                    </>
                  )}
                </Td>
                <PredictionCells t={t} />
                <Td>
                  {t.result ? (
                    <ResultPill result={t.result} side={t.side} />
                  ) : (
                    <span className="text-white/40">{pendingText(t.closeTime, now)}</span>
                  )}
                </Td>
                <Td right className={tone(t.pnlCents)}>
                  {t.pnlCents == null ? '—' : signedDollars(t.pnlCents)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const pendingText = (closeTime: string | null, now: number) => {
  const left = closeTime ? Math.round((Date.parse(closeTime) - now) / 1000) : null;
  return left != null && left > 0 ? `pending · closes in ${countdown(left)}` : 'settling…';
};

const PredictionHeads = () => (
  <>
    <Th>Side</Th>
    <Th right>Price</Th>
    <Th right>Count</Th>
    <Th right>Cost</Th>
    <Th right>Fee</Th>
    <Th right>Model</Th>
    <Th right>P(win)</Th>
    <Th right>Edge</Th>
    <Th right>EV</Th>
    <Th right>Max win</Th>
  </>
);

const PredictionCells = ({ t }: { t: Prediction }) => (
  <>
    <Td>
      <span className={t.side === 'yes' ? 'text-vitae-green' : 'text-vitae-red'}>
        {t.side?.toUpperCase() ?? '—'}
      </span>
    </Td>
    <Td right>{cents(t.priceCents)}</Td>
    <Td right>{t.count ?? '—'}</Td>
    <Td right>{dollars(t.costCents)}</Td>
    <Td right>{dollars(t.feeCents)}</Td>
    <Td right>{pct(t.modelProb, 1)}</Td>
    <Td right>
      {pct(t.pWin)}
      <span className="ml-1 text-xs text-white/40">vs {pct(t.marketPWin)}</span>
    </Td>
    <Td right>{cents(t.edgeCents, 2)}</Td>
    <Td right className={tone(t.evCents)}>
      {signedDollars(t.evCents)}
    </Td>
    <Td right>{dollars(t.maxWinCents)}</Td>
  </>
);

const ResultPill = ({ result, side }: { result: 'yes' | 'no'; side: 'yes' | 'no' | null }) => (
  <span
    className={`rounded-full border px-2 py-0.5 text-[11px] ${result === side ? 'border-vitae-green/50 text-vitae-green' : 'border-vitae-red/50 text-vitae-red'}`}
  >
    {result.toUpperCase()}
  </span>
);

function Backtest({ backtest }: { backtest: BacktestSummary }) {
  const { trades, totals, equity, byPriceBucket, ranAt } = backtest;
  const points = useMemo(() => equity.map((c, i) => ({ x: i + 1, y: c / 100 })), [equity]);
  const newestFirst = useMemo(() => [...trades].reverse(), [trades]);
  const signedCents = (n: number | null) =>
    n == null ? '—' : `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(2)}¢`;
  return (
    <section className="mt-10" aria-labelledby="backtest-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="backtest-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
          Backtest{trades.length > 0 && `: last ${totals.trades} settled windows`}
        </h2>
        {ranAt && <p className="text-xs text-white/45">Ran {hst(ranAt, true)}. Fees included.</p>}
      </div>
      {trades.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">
          No backtest yet. Run{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            cargo run --release --bin backtest
          </code>{' '}
          in kalshiRUST.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Stat label="Trades" value={String(totals.trades)} />
            <Stat label="Wins / losses" value={`${totals.wins} / ${totals.losses}`} />
            <Stat label="Hit rate" value={pct(totals.hitRate)} />
            <Stat label="Risked" value={dollars(totals.riskedCents)} />
            <Stat
              label="Net P&L"
              value={signedDollars(totals.pnlCents)}
              toneClass={tone(totals.pnlCents)}
            />
            <Stat
              label="ROI"
              value={
                totals.roi == null
                  ? '—'
                  : `${totals.roi >= 0 ? '+' : '−'}${pct(Math.abs(totals.roi), 1)}`
              }
              toneClass={tone(totals.roi)}
            />
            <Stat
              label="Avg edge"
              value={signedCents(totals.avgEdgeCents)}
              sub="predicted, per contract"
              toneClass={tone(totals.avgEdgeCents)}
            />
            <Stat
              label="Avg P&L / trade"
              value={signedCents(totals.avgPnlCents)}
              sub="realized"
              toneClass={tone(totals.avgPnlCents)}
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Equity curve</p>
              <div className="mt-3">
                <LineChart
                  points={points}
                  baseline={0}
                  height={220}
                  markers={trades.length <= 60}
                  ariaLabel="Backtest cumulative P&L per trade"
                  formatX={(x) => `#${x}`}
                  formatY={(y) => `${y < 0 ? '−' : ''}$${Math.abs(y).toFixed(2)}`}
                  tooltip={(i) => ({
                    title: `#${i + 1} · ${hst(trades[i].at, true)}`,
                    rows: [
                      { label: 'cumulative', value: signedDollars(equity[i]) },
                      { label: 'this trade', value: signedDollars(trades[i].pnlCents) },
                      { label: 'ticker', value: trades[i].ticker ?? '—' },
                    ],
                  })}
                />
              </div>
            </div>
            <div className="glass-panel overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <tr>
                    <Th>Entry price</Th>
                    <Th right>Trades</Th>
                    <Th right>Hit rate</Th>
                    <Th right>P&amp;L</Th>
                  </tr>
                </thead>
                <tbody>
                  {byPriceBucket.map((b) => (
                    <tr key={b.bucket} className="border-t border-white/10 text-white/80">
                      <Td>{b.bucket}</Td>
                      <Td right>{b.trades}</Td>
                      <Td right>{b.trades ? pct(b.wins / b.trades) : '—'}</Td>
                      <Td right className={tone(b.trades ? b.pnlCents : null)}>
                        {b.trades ? signedDollars(b.pnlCents) : '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="glass-panel mt-4 overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                <tr>
                  <Th>Close</Th>
                  <Th>Ticker</Th>
                  <PredictionHeads />
                  <Th>Result</Th>
                  <Th right>P&amp;L</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((t: BacktestTrade) => (
                  <tr key={t.id} className="border-t border-white/10 text-white/80">
                    <Td>
                      <span className="text-white/50">{hst(t.at, true)}</span>
                    </Td>
                    <Td>
                      <TickerLink ticker={t.ticker} />
                    </Td>
                    <PredictionCells t={t} />
                    <Td>
                      {t.result ? (
                        <ResultPill result={t.result} side={t.side} />
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </Td>
                    <Td right className={tone(t.pnlCents)}>
                      {t.pnlCents == null ? '—' : signedDollars(t.pnlCents)}
                    </Td>
                    <Td className="text-xs text-white/50">{t.note ?? ''}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Research() {
  return (
    <section className="mt-10" aria-labelledby="research-heading">
      <h2 id="research-heading" className="text-sm uppercase tracking-[0.2em] text-white/50">
        What the research says
      </h2>
      <ol className="glass-panel mt-4 list-decimal space-y-2 rounded-2xl p-5 pl-9 text-sm text-white/70">
        {RESEARCH.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
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
