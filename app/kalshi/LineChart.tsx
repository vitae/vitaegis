'use client';

// One line over time with a crosshair readout. Used for the market's YES price and for the
// equity curve. Thin line, a wash under it, hairline grid, the latest point ringed.

import { useId, useMemo, useRef, useState } from 'react';

export interface ChartPoint {
  x: number;
  y: number;
}

interface Props {
  points: ChartPoint[];
  ariaLabel: string;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  /** Readout rows for the hovered point; the value leads. */
  tooltip: (index: number) => { title: string; rows: { label: string; value: string }[] };
  yDomain?: [number, number];
  /** Draws a stronger hairline at this value (0 for a P&L curve). */
  baseline?: number;
  color?: string;
  /** Ring every point, not only the last; for sparse series like one dot per trade. */
  markers?: boolean;
  height?: number;
}

const W = 720;
const PAD = { top: 12, right: 14, bottom: 24, left: 44 };

function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (hi === lo) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export default function LineChart({
  points,
  ariaLabel,
  formatX,
  formatY,
  tooltip,
  yDomain,
  baseline,
  color = '#00ff00',
  markers = false,
  height = 240,
}: Props) {
  const H = height;
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    if (points.length === 0) return null;
    const ys = points.map((p) => p.y);
    let lo = yDomain ? yDomain[0] : Math.min(...ys, baseline ?? Infinity);
    let hi = yDomain ? yDomain[1] : Math.max(...ys, baseline ?? -Infinity);
    if (!yDomain) {
      const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
      lo -= pad;
      hi += pad;
    }
    const x0 = points[0].x;
    const x1 = points[points.length - 1].x;
    const x = (v: number) => PAD.left + ((v - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const line = points
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`)
      .join('');
    const floor = y(Math.max(lo, Math.min(hi, baseline ?? lo)));
    const area =
      points.length > 1
        ? `${line}L${x(x1).toFixed(1)},${floor.toFixed(1)}L${x(x0).toFixed(1)},${floor.toFixed(1)}Z`
        : '';
    const ticks = yDomain ? niceTicks(lo, hi, 4) : niceTicks(lo, hi, 4);
    const xTicks =
      points.length > 2
        ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
        : points.map((_, i) => i);
    return { x, y, line, area, ticks, xTicks, lo, hi };
  }, [points, yDomain, baseline, H]);

  const pick = (clientX: number) => {
    if (!view || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    let best = 0;
    let dist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(view.x(p.x) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };

  if (!view) {
    return <p className="py-14 text-center text-sm text-white/40">Waiting for the first quote.</p>;
  }

  const h = hover !== null ? points[hover] : null;
  const last = points[points.length - 1];
  const tip = hover !== null ? tooltip(hover) : null;
  const tipLeft = h ? (view.x(h.x) / W) * 100 : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-vitae-green"
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setHover((i) => Math.max(0, (i ?? points.length) - 1));
          if (e.key === 'ArrowRight') setHover((i) => Math.min(points.length - 1, (i ?? -1) + 1));
          if (e.key === 'Escape') setHover(null);
        }}
      >
        <defs>
          <linearGradient id={`${id}-wash`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {view.ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={view.y(t)}
              y2={view.y(t)}
              stroke="#ffffff"
              strokeOpacity={baseline !== undefined && t === baseline ? 0.3 : 0.08}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 8}
              y={view.y(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="#ffffff"
              fillOpacity="0.45"
            >
              {formatY(t)}
            </text>
          </g>
        ))}
        {baseline !== undefined &&
          !view.ticks.includes(baseline) &&
          baseline >= view.lo &&
          baseline <= view.hi && (
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={view.y(baseline)}
              y2={view.y(baseline)}
              stroke="#ffffff"
              strokeOpacity="0.3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        {view.xTicks.map((i) => (
          <text
            key={i}
            x={view.x(points[i].x)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fontSize="10"
            fill="#ffffff"
            fillOpacity="0.45"
          >
            {formatX(points[i].x)}
          </text>
        ))}

        {view.area && <path d={view.area} fill={`url(#${id}-wash)`} />}
        <path
          d={view.line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {(markers ? points : [last]).map((p, i) => (
          <circle
            key={i}
            cx={view.x(p.x)}
            cy={view.y(p.y)}
            r="4"
            fill={color}
            stroke="#000"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {h && (
          <g>
            <line
              x1={view.x(h.x)}
              x2={view.x(h.x)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#ffffff"
              strokeOpacity="0.35"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={view.x(h.x)}
              cy={view.y(h.y)}
              r="5"
              fill="#000"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-white/15 bg-black/85 px-3 py-2 text-xs backdrop-blur"
          style={{ left: `min(max(${tipLeft}%, 0%), calc(100% - 11rem))`, width: '10.5rem' }}
        >
          <p className="text-white/50">{tip.title}</p>
          {tip.rows.map((r) => (
            <p key={r.label} className="mt-0.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-white">{r.value}</span>
              <span className="text-white/50">{r.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
