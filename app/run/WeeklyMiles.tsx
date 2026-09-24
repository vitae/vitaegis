'use client';

// Weekly mileage, one column per week. Single series, so no legend: the heading names it.
// Fill #00b336 is the dimmed step that clears contrast on black; the current, still-running
// week gets the bright brand green as emphasis, never as a value ramp.

import { useMemo, useState } from 'react';
import type { WeekBucket } from '@/lib/strava';

const FILL = '#00b336';
const CURRENT = '#00ff00';

export default function WeeklyMiles({ weeks }: { weeks: WeekBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 180;
  const padL = 34;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const GAP = 2;

  const { max, ticks, bandW, barW, x, y, peak } = useMemo(() => {
    const hi = Math.max(10, Math.ceil(Math.max(...weeks.map((w) => w.miles)) / 5) * 5);
    const step = hi > 40 ? 20 : hi > 20 ? 10 : 5;
    const ticks: number[] = [];
    for (let t = 0; t <= hi; t += step) ticks.push(t);
    const bandW = (W - padL - padR) / weeks.length;
    const barW = Math.max(6, bandW - GAP * 2);
    const x = (i: number) => padL + i * bandW + (bandW - barW) / 2;
    const y = (mi: number) => padT + (1 - mi / hi) * (H - padT - padB);
    let peak = 0;
    weeks.forEach((w, i) => {
      if (w.miles > weeks[peak].miles) peak = i;
    });
    return { max: hi, ticks, bandW, barW, x, y, peak };
  }, [weeks]);

  const base = y(0);
  const active = hover === null ? null : weeks[hover];

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`Miles per week for the last ${weeks.length} weeks, up to ${max} miles`}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={padL - 6}
              y={y(t) + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgba(255,255,255,0.45)"
            >
              {t}
            </text>
          </g>
        ))}

        {weeks.map((w, i) => {
          const h = Math.max(w.miles > 0 ? 2 : 0, base - y(w.miles));
          const on = hover === i;
          return (
            <g key={w.start}>
              {h > 0 && (
                <rect
                  x={x(i)}
                  y={base - h}
                  width={barW}
                  height={h}
                  rx="4"
                  fill={w.current ? CURRENT : FILL}
                  opacity={hover === null || on ? 1 : 0.55}
                />
              )}
              {/* Hit target spans the whole band so thin bars stay easy to hover. */}
              <rect
                x={padL + i * bandW}
                y={padT}
                width={bandW}
                height={H - padT - padB}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
              />
              {i % 2 === 0 && (
                <text
                  x={x(i) + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.45)"
                >
                  {w.label}
                </text>
              )}
            </g>
          );
        })}

        {/* One direct label: the biggest week. The axis and the tooltip carry the rest. */}
        {weeks[peak].miles > 0 && hover === null && (
          <text
            x={x(peak) + barW / 2}
            y={y(weeks[peak].miles) - 5}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.8)"
          >
            {weeks[peak].miles.toFixed(1)}
          </text>
        )}

        <line
          x1={padL}
          x2={W - padR}
          y1={base}
          y2={base}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
      </svg>

      <figcaption className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.18em] text-white/50">
        <span>miles · week of</span>
        <span className="tabular-nums text-white/80">
          {active
            ? `week of ${active.label} · ${active.miles.toFixed(1)} mi · ${active.runs} ${active.runs === 1 ? 'run' : 'runs'}`
            : 'hover or touch for a week'}
        </span>
      </figcaption>
    </figure>
  );
}
