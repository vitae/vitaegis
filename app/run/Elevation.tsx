'use client';

// Single-series elevation profile with a hover crosshair. Distance in miles, height in feet.

import { useMemo, useState } from 'react';

interface Props { profile: [number, number][]; color: string; miles: number }

export default function Elevation({ profile, color, miles }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 150;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 22;

  const { path, area, minFt, maxFt, x, y, ticks } = useMemo(() => {
    const fts = profile.map((p) => p[1]);
    const lo = Math.max(0, Math.floor((Math.min(...fts) - 5) / 25) * 25);
    const hi = Math.max(lo + 50, Math.ceil((Math.max(...fts) + 10) / 25) * 25);
    const x = (mi: number) => padL + (mi / miles) * (W - padL - padR);
    const y = (ft: number) => padT + (1 - (ft - lo) / (hi - lo)) * (H - padT - padB);
    const pts = profile.map(([mi, ft]) => `${x(mi).toFixed(1)},${y(ft).toFixed(1)}`);
    const path = `M${pts.join('L')}`;
    const area = `${path}L${x(miles).toFixed(1)},${y(lo)}L${x(0)},${y(lo)}Z`;
    const step = hi - lo > 200 ? 100 : 50;
    const ticks: number[] = [];
    for (let t = lo; t <= hi; t += step) ticks.push(t);
    return { path, area, minFt: lo, maxFt: hi, x, y, ticks };
  }, [profile, miles]);

  const idx = hover === null ? null : Math.min(profile.length - 1, Math.max(0, Math.round(hover * (profile.length - 1))));
  const pt = idx === null ? null : profile[idx];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.min(1, Math.max(0, (px - padL) / (W - padL - padR))));
  };

  const mileTicks: number[] = [];
  const mStep = miles > 15 ? 5 : miles > 6 ? 2 : 1;
  for (let m = 0; m <= miles; m += mStep) mileTicks.push(m);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`Elevation profile, ${minFt} to ${maxFt} feet over ${miles} miles`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)">
              {t}
            </text>
          </g>
        ))}
        {mileTicks.map((m) => (
          <text key={m} x={x(m)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">
            {m}
          </text>
        ))}
        <path d={area} fill={`url(#fill-${color.slice(1)})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pt && (
          <g>
            <line x1={x(pt[0])} x2={x(pt[0])} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
            <circle cx={x(pt[0])} cy={y(pt[1])} r="4.5" fill="#000" stroke={color} strokeWidth="2" />
          </g>
        )}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.18em] text-white/50">
        <span>feet · miles</span>
        <span className="tabular-nums text-white/80">
          {pt ? `mile ${pt[0].toFixed(1)} · ${pt[1]} ft` : 'hover or touch for a point'}
        </span>
      </figcaption>
    </figure>
  );
}
