'use client';

// Kalshi bot: is it alive, what market is it watching, what has it bought. The bot itself
// runs elsewhere (scripts/kalshi_bot.py); this screen only reads what it logs.

import { useCallback, useEffect, useState } from 'react';
import AdminShell, { ui } from '@/components/admin/AdminShell';
import { dollars, type KalshiEvent, type KalshiSummary } from '@/lib/kalshi';

const REFRESH_MS = 15_000;

const hst = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        timeZone: 'Pacific/Honolulu',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

const cents = (n: number | null | undefined) => (n == null ? '—' : `${n}¢`);

function countdown(closeTime: string | null, now: number) {
  if (!closeTime) return '—';
  const s = Math.max(0, Math.round((Date.parse(closeTime) - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function KalshiDesk() {
  return (
    <AdminShell
      title="Kalshi bot"
      blurb="The KXBTC15M contrarian bot, read from its own log. It refreshes every 15 seconds; the bot polls Kalshi on the same cadence from wherever it runs."
      probe="/api/admin/kalshi"
    >
      {(key) => <Body adminKey={key} />}
    </AdminShell>
  );
}

function Body({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<KalshiSummary | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kalshi', {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
      });
      const body = (await res.json()) as KalshiSummary & { error?: string };
      if (!res.ok) throw new Error(body.error || String(res.status));
      setData(body);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the bot log.');
    }
  }, [adminKey]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  if (error) return <p className="mt-8 text-sm text-red-400">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-white/50">Loading…</p>;

  const m = data.market;
  const mode = data.live == null ? '—' : data.live ? 'Live' : 'Dry run';

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat
          label="Bot"
          value={data.online ? 'Online' : 'Offline'}
          tone={data.online ? 'green' : 'red'}
          sub={data.lastSeen ? `seen ${hst(data.lastSeen)}` : 'no log yet'}
        />
        <Stat label="Mode" value={mode} tone={data.live ? 'green' : 'dim'} />
        <Stat label="Balance" value={dollars(data.balanceCents)} />
        <Stat label="Orders · 24h" value={String(data.orders24h)} />
      </div>

      <section className={`${ui.glass} p-4 sm:p-5`}>
        <p className={ui.label}>Watching</p>
        {!m ? (
          <p className="mt-3 text-sm text-white/50">No market seen yet.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-wide text-white">{m.ticker}</h2>
              <span className="text-sm text-white/60">closes in {countdown(m.closeTime, now)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
              <Quote side="YES" ask={m.yesAsk} hot={m.entry?.outcome === 'yes'} />
              <Quote side="NO" ask={m.noAsk} hot={m.entry?.outcome === 'no'} />
            </div>
            <p className={`mt-4 text-sm ${m.entry ? 'text-vitae-green' : 'text-white/50'}`}>
              {m.entry
                ? `In the zone: ${m.entry.outcome.toUpperCase()} at ${m.entry.priceCents}¢`
                : 'Outside the 8–28¢ entry zone'}
            </p>
          </>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className={ui.label}>Orders</p>
          <button onClick={() => void load()} className={ui.btnQuiet}>
            Refresh
          </button>
        </div>
        {data.orders.length === 0 ? (
          <p className={`${ui.glass} mt-3 p-5 text-sm text-white/50`}>No orders yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.orders.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      {data.errors.length > 0 && (
        <section>
          <p className={`${ui.label} text-red-400`}>Errors</p>
          <div className="mt-3 space-y-2">
            {data.errors.map((e) => (
              <div key={e.id} className={`${ui.glass} flex justify-between gap-3 p-3 text-sm`}>
                <span className="text-red-400">{e.message}</span>
                <span className="shrink-0 text-xs text-white/40">{hst(e.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className={ui.label}>Recent ticks</p>
        <div className={`${ui.glass} mt-3 overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">YES ask</th>
                <th className="px-4 py-3 font-medium">NO ask</th>
              </tr>
            </thead>
            <tbody>
              {data.ticks.map((t) => (
                <tr key={t.id} className="border-t border-white/10 text-white/80">
                  <td className="px-4 py-2 text-white/50">{hst(t.created_at)}</td>
                  <td className="px-4 py-2">{t.ticker}</td>
                  <td className="px-4 py-2">{cents(t.yes_ask_cents)}</td>
                  <td className="px-4 py-2">{cents(t.no_ask_cents)}</td>
                </tr>
              ))}
              {data.ticks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-white/50">
                    Nothing logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = 'white',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'green' | 'red' | 'dim' | 'white';
}) {
  const color = {
    green: 'text-vitae-green',
    red: 'text-red-400',
    dim: 'text-white/60',
    white: 'text-white',
  }[tone];
  return (
    <div className={`${ui.glass} p-4`}>
      <p className={ui.label}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function Quote({ side, ask, hot }: { side: string; ask: number | null; hot: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${hot ? 'border-vitae-green/60' : 'border-white/10'}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{side} ask</p>
      <p className={`mt-1 text-3xl font-semibold ${hot ? 'text-vitae-green' : 'text-white'}`}>
        {cents(ask)}
      </p>
    </div>
  );
}

function OrderRow({ o }: { o: KalshiEvent }) {
  const filled = o.fill_count != null ? `${o.fill_count} filled` : null;
  const left = o.remaining_count ? `${o.remaining_count} open` : null;
  return (
    <article className={`${ui.glass} flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm`}>
      <span
        className={`text-[10px] uppercase tracking-[0.25em] ${
          o.live ? 'text-vitae-green' : 'text-white/40'
        }`}
      >
        {o.live ? 'Live' : 'Dry'}
      </span>
      <span className="font-semibold text-white">
        {o.count}× {o.outcome?.toUpperCase()} @ {cents(o.price_cents)}
      </span>
      <span className="text-white/60">{o.ticker}</span>
      <span className="text-white/50">
        {[filled, left, o.avg_fill_cents != null ? `avg ${o.avg_fill_cents}¢` : null]
          .filter(Boolean)
          .join(' · ')}
      </span>
      <span className="ml-auto text-xs text-white/40">{hst(o.created_at)}</span>
    </article>
  );
}
