'use client';

import { useMemo, useRef, useState } from 'react';
import styles from './crypto.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Bought the June low
   Bitcoin's lowest Chainlink price in June 2026, and what a sum put in at that exact
   moment is worth every day since. The amount is editable.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  low: { price: number; at: number };
  /** Daily closes from the low onward, oldest first. */
  closes: { date: string; close: number }[];
  livePrice: number;
  /** Seconds; when livePrice was written. */
  asOf: number;
}

const PRESETS = [1_000, 10_000, 100_000];
const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 8, left: 8 };

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const when = (sec: number, withTime = false) =>
  new Date(sec * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}),
    timeZone: 'Pacific/Honolulu',
  });

export default function DipWindow({ low, closes, livePrice, asOf }: Props) {
  const [amount, setAmount] = useState(10_000);
  const [draft, setDraft] = useState('10,000');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // The path from the buy to now: the low itself, each daily close after it, the live price.
  const series = useMemo(
    () => [
      { t: low.at, p: low.price },
      ...closes
        .map((c) => ({ t: Date.parse(`${c.date}T23:59:59Z`) / 1000, p: c.close }))
        .filter((c) => c.t > low.at),
      { t: asOf, p: livePrice },
    ],
    [low, closes, livePrice, asOf],
  );

  const coins = amount / low.price;
  const value = coins * livePrice;
  const gain = value - amount;
  const gainPct = (gain / amount) * 100;
  const peak = series.reduce((a, b) => (b.p > a.p ? b : a));
  const up = gain >= 0;

  const view = useMemo(() => {
    const vals = series.map((s) => s.p);
    const lo = Math.min(...vals) * 0.98;
    const hi = Math.max(...vals) * 1.02;
    const t0 = series[0].t;
    const t1 = series[series.length - 1].t;
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
    const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const line = series
      .map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(s.p).toFixed(1)}`)
      .join('');
    const base = y(low.price);
    const area = `${line}L${x(t1).toFixed(1)},${base.toFixed(1)}L${x(t0).toFixed(1)},${base.toFixed(1)}Z`;
    return { x, y, line, area, base };
  }, [series, low.price]);

  const commit = (text: string) => {
    const n = Math.round(Number(text.replace(/[^0-9.]/g, '')));
    if (Number.isFinite(n) && n > 0) {
      setAmount(Math.min(n, 1_000_000_000));
      setDraft(Math.min(n, 1_000_000_000).toLocaleString('en-US'));
    } else setDraft(amount.toLocaleString('en-US'));
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    series.forEach((s, i) => {
      if (Math.abs(view.x(s.t) - px) < Math.abs(view.x(series[best].t) - px)) best = i;
    });
    setHover(best);
  };
  const h = hover !== null ? series[hover] : null;

  return (
    <section aria-labelledby="dip-heading" className={`mt-14 ${styles.numeric}`}>
      <h2 id="dip-heading" className="text-xl font-medium text-white">
        If you bought the June low
      </h2>
      <p className="mt-1 text-sm text-vitae-gray">
        Bitcoin bottomed at <span className="text-white">{money(low.price)}</span> on{' '}
        {when(low.at, true)}, its lowest Chainlink price of June.
      </p>

      <div className="mt-4 rounded-xl border border-white/15 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dip-amount" className="text-sm text-vitae-gray">
            Invested
          </label>
          <div className="flex items-center rounded-full border border-white/25 px-3 py-1 focus-within:border-vitae-green">
            <span className="text-vitae-gray">$</span>
            <input
              id="dip-amount"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
              className="w-28 bg-transparent pl-1 text-white outline-none"
            />
          </div>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => commit(String(p))}
              aria-pressed={amount === p}
              className={`rounded-full px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-vitae-green motion-safe:transition-colors ${
                amount === p
                  ? 'bg-vitae-green text-black'
                  : 'border border-white/20 text-vitae-gray hover:text-white'
              }`}
            >
              {p >= 1000 ? `$${p / 1000}k` : `$${p}`}
            </button>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-vitae-gray">Worth today</dt>
            <dd
              className={`text-2xl font-semibold ${up ? 'text-vitae-green' : 'text-vitae-red'}`}
              aria-live="polite"
            >
              {money(value)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-vitae-gray">Gain</dt>
            <dd className={`text-lg font-medium ${up ? 'text-vitae-green' : 'text-vitae-red'}`}>
              {up ? '+' : '−'}
              {money(Math.abs(gain))}{' '}
              <span className="text-sm">
                ({up ? '+' : '−'}
                {Math.abs(gainPct).toFixed(1)}%)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-vitae-gray">Bitcoin bought</dt>
            <dd className="text-lg text-white">{coins.toFixed(coins < 1 ? 5 : 3)} BTC</dd>
          </div>
          <div>
            <dt className="text-xs text-vitae-gray">Peak since</dt>
            <dd className="text-lg text-white">
              {money(coins * peak.p)}
              <span className="block text-xs text-vitae-gray">{when(peak.t)}</span>
            </dd>
          </div>
        </dl>

        <div className="relative mt-5">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full touch-none select-none"
            role="img"
            aria-label={`Value of ${money(amount)} invested at the June low, now ${money(value)}`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="dip-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#00ff00" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00ff00" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={view.area} fill="url(#dip-fill)" />
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={view.base}
              y2={view.base}
              stroke="#ffffff"
              strokeOpacity="0.35"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={view.line}
              fill="none"
              stroke="#00ff00"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={view.x(series[0].t)}
              cy={view.y(series[0].p)}
              r="5"
              fill="#000"
              stroke="#f7931a"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {h && (
              <g>
                <line
                  x1={view.x(h.t)}
                  x2={view.x(h.t)}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="#ffffff"
                  strokeOpacity="0.35"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={view.x(h.t)}
                  cy={view.y(h.p)}
                  r="4"
                  fill="#000"
                  stroke="#00ff00"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
          </svg>
          {h && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-xs backdrop-blur">
              <p className="text-vitae-gray">{when(h.t)}</p>
              <p className="text-sm font-medium text-white">{money(coins * h.p)}</p>
              <p className="text-white/60">BTC {money(h.p)}</p>
            </div>
          )}
          <p className="mt-1 flex justify-between text-xs text-vitae-gray">
            <span>
              <span className="text-vitae-orange">●</span> Bought {when(low.at)}
            </span>
            <span>Dashed line: break-even</span>
          </p>
        </div>
      </div>
    </section>
  );
}
