'use client';

import { useMemo, useRef, useState } from 'react';
import styles from './crypto.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Bitcoin chart
   1D and 1W draw every Chainlink round; 1M and 1Y draw daily closes with the 50- and
   200-day averages, the lines the trend read is built on. Hover or drag for a price.
   ═══════════════════════════════════════════════════════════════════════════════ */

type Range = '1D' | '1W' | '1M' | '1Y';

interface Daily {
  date: string;
  close: number;
  ma50: number | null;
  ma200: number | null;
}

interface Props {
  intraday: [number, number][];
  daily: Daily[];
  livePrice: number;
  /** When livePrice was written (ms). Used as "now" so server and client draw the same path. */
  asOf: number;
}

interface Pt {
  t: number; // ms
  p: number;
  ma50?: number | null;
  ma200?: number | null;
}

const W = 720;
const H = 260;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

const RANGES: { key: Range; label: string }[] = [
  { key: '1D', label: '1D' },
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '1Y', label: '1Y' },
];

const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export default function BtcChart({ intraday, daily, livePrice, asOf }: Props) {
  const [range, setRange] = useState<Range>('1Y');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points: Pt[] = useMemo(() => {
    const nowMs = asOf;
    if (range === '1D' || range === '1W') {
      const since = nowMs - (range === '1D' ? 1 : 7) * 86_400_000;
      return intraday.filter(([t]) => t * 1000 >= since).map(([t, p]) => ({ t: t * 1000, p }));
    }
    const days = range === '1M' ? 30 : 365;
    const rows = daily.slice(-days).map((d) => ({
      t: Date.parse(`${d.date}T23:59:59Z`),
      p: d.close,
      ma50: d.ma50,
      ma200: d.ma200,
    }));
    return [...rows, { t: nowMs, p: livePrice }];
  }, [range, intraday, daily, livePrice, asOf]);

  const view = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.flatMap((x) => [x.p, x.ma50 ?? x.p, x.ma200 ?? x.p]);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const padY = (hi - lo) * 0.08 || hi * 0.01;
    lo -= padY;
    hi += padY;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
    const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const line = (get: (q: Pt) => number | null | undefined) => {
      let d = '';
      let pen = false;
      for (const q of points) {
        const v = get(q);
        if (v === null || v === undefined) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${x(q.t).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      }
      return d;
    };
    const price = line((q) => q.p);
    const area = `${price}L${x(t1).toFixed(1)},${H - PAD.bottom}L${x(t0).toFixed(1)},${H - PAD.bottom}Z`;
    const first = points[0].p;
    const last = points[points.length - 1].p;
    return {
      x,
      y,
      price,
      area,
      ma50: range === '1Y' || range === '1M' ? line((q) => q.ma50) : '',
      ma200: range === '1Y' || range === '1M' ? line((q) => q.ma200) : '',
      up: last >= first,
      change: ((last - first) / first) * 100,
      lo: Math.min(...points.map((q) => q.p)),
      hi: Math.max(...points.map((q) => q.p)),
    };
  }, [points, range]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!view || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    let dist = Infinity;
    points.forEach((q, i) => {
      const d = Math.abs(view.x(q.t) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const h = hover !== null ? points[hover] : null;
  const fmtWhen = (t: number) =>
    new Date(t).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(range === '1D' || range === '1W'
        ? { hour: 'numeric', minute: '2-digit' }
        : { year: 'numeric' }),
      timeZone: 'Pacific/Honolulu',
    });

  return (
    <section aria-labelledby="btc-chart-heading" className={`mt-10 ${styles.numeric}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="btc-chart-heading" className="text-xl font-medium text-white">
            Price
          </h2>
          {view && (
            <p className="mt-1 text-sm text-vitae-gray">
              <span className={view.up ? 'text-vitae-green' : 'text-vitae-red'}>
                {view.change >= 0 ? '+' : '−'}
                {Math.abs(view.change).toFixed(2)}%
              </span>
              <span aria-hidden> · </span>
              low {usd0(view.lo)} · high {usd0(view.hi)}
            </p>
          )}
        </div>
        <div
          className="grid grid-cols-4 gap-1 rounded-full border border-white/15 p-1"
          role="group"
          aria-label="Chart range"
        >
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRange(r.key);
                  setHover(null);
                }}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-vitae-green sm:text-sm motion-safe:transition-colors ${
                  active ? 'bg-vitae-green text-black' : 'text-vitae-gray hover:text-white'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-4 rounded-xl border border-white/15 bg-white/[0.02] p-2">
        {view ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full touch-none select-none"
            role="img"
            aria-label={`Bitcoin price over ${range}, ${view.change >= 0 ? 'up' : 'down'} ${Math.abs(view.change).toFixed(1)} percent`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="btc-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={view.up ? '#00ff00' : '#ff0000'} stopOpacity="0.22" />
                <stop offset="100%" stopColor={view.up ? '#00ff00' : '#ff0000'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={view.area} fill="url(#btc-fill)" />
            {view.ma200 && (
              <path
                d={view.ma200}
                fill="none"
                stroke="#f7931a"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {view.ma50 && (
              <path
                d={view.ma50}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.55"
                strokeWidth="1.25"
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path
              d={view.price}
              fill="none"
              stroke={view.up ? '#00ff00' : '#ff0000'}
              strokeWidth="2"
              strokeLinejoin="round"
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
                  stroke={view.up ? '#00ff00' : '#ff0000'}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
          </svg>
        ) : (
          <p className="py-16 text-center text-sm text-vitae-gray">
            Not enough data for this range yet.
          </p>
        )}

        {h && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-xs backdrop-blur">
            <p className="text-vitae-gray">{fmtWhen(h.t)}</p>
            <p className="text-sm font-medium text-white">{usd0(h.p)}</p>
            {h.ma50 ? <p className="text-white/60">50-day {usd0(h.ma50)}</p> : null}
            {h.ma200 ? <p className="text-vitae-orange">200-day {usd0(h.ma200)}</p> : null}
          </div>
        )}
      </div>

      {(range === '1Y' || range === '1M') && (
        <p className="mt-2 flex gap-4 text-xs text-vitae-gray">
          <span>
            <span
              className="mr-1 inline-block w-4 border-t border-dashed border-white/60 align-middle"
              aria-hidden
            />
            50-day average
          </span>
          <span>
            <span
              className="mr-1 inline-block w-4 border-t-2 border-dashed border-vitae-orange align-middle"
              aria-hidden
            />
            200-day average
          </span>
        </p>
      )}
    </section>
  );
}
