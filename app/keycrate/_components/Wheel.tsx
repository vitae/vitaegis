'use client';

import { useMemo } from 'react';
import { CAMELOT_KEYS, KEY_NAMES } from '@/lib/keycrate/camelot';
import type { Transition } from '@/lib/keycrate/harmonic';
import type { Camelot } from '@/lib/keycrate/types';
import { TRANSITION_COLOR } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   Camelot wheel: major keys (B) on the outer ring, minor (A) inside, 1 at the top
   going clockwise. Tap a key to filter; a set's path is drawn as connected points.
   ═══════════════════════════════════════════════════════════════════════════════ */

const SIZE = 320;
const C = SIZE / 2;
const R_OUTER = 150;
const R_MID = 106;
const R_INNER = 60;

// Rounded so server and browser trig agree to the digit and hydration never sees a mismatch.
const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [
    Math.round((C + r * Math.cos(rad)) * 100) / 100,
    Math.round((C + r * Math.sin(rad)) * 100) / 100,
  ] as const;
};

function segmentPath(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}

/** Centre of a key's segment, where set points land. */
export function keyPoint(key: Camelot): readonly [number, number] {
  const n = Number(key.slice(0, -1));
  const isB = key.endsWith('B');
  const angle = (n - 1) * 30 + 15;
  return polar(isB ? (R_OUTER + R_MID) / 2 : (R_MID + R_INNER) / 2, angle);
}

export interface WheelProps {
  selected?: Set<Camelot>;
  onToggle?: (key: Camelot) => void;
  /** Keys of the tracks in the set, in order, with the transition into each one. */
  path?: Array<{ key: Camelot | null; transition: Transition | null }>;
  /** Keys with at least one track in the library, to fade the empty ones. */
  available?: Set<Camelot>;
  className?: string;
}

export default function Wheel({
  selected,
  onToggle,
  path = [],
  available,
  className = '',
}: WheelProps) {
  const segments = useMemo(
    () =>
      CAMELOT_KEYS.map((key) => {
        const n = Number(key.slice(0, -1));
        const isB = key.endsWith('B');
        const a0 = (n - 1) * 30;
        const a1 = a0 + 30;
        const [lx, ly] = polar(isB ? (R_OUTER + R_MID) / 2 : (R_MID + R_INNER) / 2, a0 + 15);
        return {
          key,
          d: segmentPath(isB ? R_MID : R_INNER, isB ? R_OUTER : R_MID, a0, a1),
          lx,
          ly,
        };
      }),
    [],
  );

  const points = path.map((p) => (p.key ? keyPoint(p.key) : null));
  const interactive = !!onToggle;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`h-auto w-full max-w-[360px] ${className}`}
      role={interactive ? 'group' : 'img'}
      aria-label="Camelot wheel"
    >
      {segments.map(({ key, d, lx, ly }) => {
        const isSel = selected?.has(key);
        const dim = available && !available.has(key);
        const inner = (
          <>
            <path
              d={d}
              fill={isSel ? '#00ff00' : 'rgba(255,255,255,0.03)'}
              stroke={isSel ? '#00ff00' : 'rgba(255,255,255,0.18)'}
              strokeWidth={1}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={key.endsWith('B') ? 14 : 12}
              fill={isSel ? '#000' : dim ? '#808880' : '#fff'}
            >
              {key}
            </text>
          </>
        );
        return interactive ? (
          <g
            key={key}
            role="button"
            tabIndex={0}
            aria-pressed={!!isSel}
            aria-label={`${key}, ${KEY_NAMES[key]}`}
            className="cursor-pointer outline-none"
            onClick={() => onToggle?.(key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle?.(key);
              }
            }}
            style={{ opacity: dim && !isSel ? 0.5 : 1 }}
          >
            {inner}
          </g>
        ) : (
          <g key={key} style={{ opacity: dim && !isSel ? 0.5 : 1 }}>
            {inner}
          </g>
        );
      })}

      {/* Set path */}
      {points.map((pt, i) => {
        if (i === 0 || !pt) return null;
        const prev = points[i - 1];
        if (!prev) return null;
        const t = path[i].transition;
        const color = t ? TRANSITION_COLOR[t.type] : '#808880';
        return (
          <line
            key={`l${i}`}
            x1={prev[0]}
            y1={prev[1]}
            x2={pt[0]}
            y2={pt[1]}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
      {points.map((pt, i) =>
        pt ? (
          <g key={`p${i}`}>
            <circle
              cx={pt[0]}
              cy={pt[1]}
              r={i === 0 ? 7 : 5}
              fill="#000"
              stroke={i === path.length - 1 ? '#fff' : '#00ff00'}
              strokeWidth={2}
            />
            {(i === 0 || i === path.length - 1) && (
              <text
                x={pt[0]}
                y={pt[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fill="#fff"
              >
                {i + 1}
              </text>
            )}
          </g>
        ) : null,
      )}
      <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#808880">
        {path.length ? `${path.length} tracks` : 'tap a key'}
      </text>
    </svg>
  );
}
