'use client';

import { useEffect, useId, useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   The mark as lit glass, the way the 2026 console boot logos are built: a deep
   glow bleeding onto black, a body shaded pale at the top to deep green at the base,
   a specular highlight that sweeps across the surface, and a bright core. On top of
   that, the lightning: every few seconds a price chart is traced through the letters,
   left to right, climbing in jagged candles like a stock on a run (clipped to the
   glyphs so it reads as current running inside the glass), with a flash of the whole
   mark as it breaks out at the top right.
   Everything is SVG filters and CSS animation: no canvas, no per-frame JavaScript,
   and it stops under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
}

const W = 1000;
const H = 220;
const BASE_Y = 160;

/** Deterministic noise so a bolt is the same across server and client render. */
const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * A rising price line from the bottom left to the top right of the mark: a run of
 * candles that mostly close higher, with a few red-day dips so it reads as a market
 * and not a ramp. Returns the line plus short "volume" ticks under some of the moves.
 */
function chart(seed: number) {
  const steps = 22;
  const pts: [number, number][] = [];
  let y = H - 40;
  const top = 36;
  const bottom = H - 30;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    if (i > 0) {
      // Up about three moves in four, and the trend line itself climbs.
      const up = hash(seed, i) < 0.74;
      const size = 8 + hash(seed, i + 50) * 34;
      y += up ? -size : size * 0.7;
      y = Math.min(bottom, Math.max(top, y - (i / steps) * 3));
    }
    pts.push([x, y]);
  }
  // Force a breakout: the last two candles close near the top.
  pts[steps - 1][1] = Math.min(pts[steps - 1][1], top + 40);
  pts[steps][1] = top + 8;
  const main = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const ticks: string[] = [];
  for (let i = 1; i < steps; i += 2) {
    const [x, py] = pts[i];
    const h = 10 + hash(seed, 900 + i) * 18;
    ticks.push(
      `M${x.toFixed(1)} ${(py + 6).toFixed(1)}L${x.toFixed(1)} ${(py + 6 + h).toFixed(1)}`,
    );
  }
  return { main, ticks, end: pts[steps] };
}

export default function LogoGlow({ text = 'VITAEGIS', className = '' }: Props) {
  const id = useId().replace(/:/g, '');
  const [strike, setStrike] = useState(0);

  // A new run every 2.8–4.4 s; the seed picks the shape of the chart.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const next = () => {
      setStrike((s) => s + 1);
      timer = window.setTimeout(next, 2800 + Math.random() * 1600);
    };
    timer = window.setTimeout(next, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const run = useMemo(() => chart(strike * 7919 + 13), [strike]);

  const mark = (fill: string, extra: React.SVGProps<SVGTextElement> = {}) => (
    <text
      x={W / 2}
      y={BASE_Y}
      textAnchor="middle"
      fontFamily="Jost, 'Century Gothic', sans-serif"
      fontWeight={700}
      fontSize={150}
      letterSpacing={10}
      fill={fill}
      {...extra}
    >
      {text}
    </text>
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`logo-glow block h-auto w-full overflow-visible ${className}`}
      role="img"
      aria-label={text}
    >
      <defs>
        {/* Glass body: pale rim at the top, pure green body, deep green base. */}
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6FFE0" />
          <stop offset="0.38" stopColor="#5BFF5B" />
          <stop offset="0.55" stopColor="#00FF00" />
          <stop offset="1" stopColor="#00A000" />
        </linearGradient>
        {/* A moving band of white: the specular highlight crossing the surface. */}
        <linearGradient
          id={`${id}-spec`}
          gradientUnits="userSpaceOnUse"
          x1="-300"
          y1="0"
          x2="0"
          y2="220"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animate
            attributeName="x1"
            values="-300;1000"
            dur="5.5s"
            repeatCount="indefinite"
            begin="0.4s"
          />
          <animate
            attributeName="x2"
            values="0;1300"
            dur="5.5s"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#00FF00" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#00FF00" stopOpacity="0.12" />
          <stop offset="1" stopColor="#00FF00" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-deep`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id={`${id}-mid`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-bolt`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`${id}-clip`}>{mark('#fff')}</clipPath>
      </defs>

      {/* Glow bleeding onto black. */}
      <ellipse
        cx={W / 2}
        cy={BASE_Y - 50}
        rx={W * 0.55}
        ry={150}
        fill={`url(#${id}-halo)`}
        className="logo-glow__breathe"
      />
      <g filter={`url(#${id}-deep)`} opacity="0.75" className="logo-glow__breathe">
        {mark('#00FF00')}
      </g>
      <g filter={`url(#${id}-mid)`} opacity="0.9">
        {mark('#00FF00')}
      </g>

      {/* The glass body and its highlight. */}
      {mark(`url(#${id}-glass)`)}
      {mark(`url(#${id}-spec)`, { style: { mixBlendMode: 'screen' } })}

      {/* The chart running up through the glass, and a flash of the mark when it breaks out. */}
      <g key={strike} className="logo-glow__strike">
        {mark('#FFFFFF', { className: 'logo-glow__flash' })}
        <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-bolt)`}>
          <path
            d={run.main}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="logo-glow__bolt"
          />
          <path
            d={run.main}
            fill="none"
            stroke="#CCFFCC"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="logo-glow__bolt"
          />
          <path
            d={run.ticks.join('')}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.6"
            className="logo-glow__ticks"
          />
        </g>
        {/* The same line, faint, outside the letters so the run reads across the gaps. */}
        <g filter={`url(#${id}-bolt)`} opacity="0.3">
          <path
            d={run.main}
            fill="none"
            stroke="#00FF00"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="logo-glow__bolt"
          />
        </g>
        <circle cx={run.end[0]} cy={run.end[1]} r="7" fill="#FFFFFF" className="logo-glow__spark" />
      </g>

      <style>{`
        .logo-glow { filter: drop-shadow(0 0 24px rgba(0,255,0,0.35)); }
        .logo-glow__breathe { animation: logo-breathe 4s ease-in-out infinite; transform-origin: 50% 50%; }
        .logo-glow__bolt {
          stroke-dasharray: 2600;
          stroke-dashoffset: 2600;
          opacity: 0;
          animation: logo-bolt 1.4s cubic-bezier(0.3, 0.6, 0.4, 1) forwards;
        }
        .logo-glow__ticks { opacity: 0; animation: logo-ticks 1.4s ease-out forwards; }
        .logo-glow__spark { opacity: 0; transform-box: fill-box; transform-origin: center; animation: logo-spark 1.4s ease-out forwards; }
        .logo-glow__flash { opacity: 0; animation: logo-flash 1.4s ease-out forwards; mix-blend-mode: screen; }
        @keyframes logo-breathe { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes logo-bolt {
          0% { stroke-dashoffset: 2600; opacity: 1; }
          55% { stroke-dashoffset: 0; opacity: 1; }
          70% { opacity: 0.9; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes logo-ticks {
          0%, 20% { opacity: 0; }
          55% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes logo-spark {
          0%, 52% { opacity: 0; transform: scale(0.4); }
          58% { opacity: 1; transform: scale(1.6); }
          75% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        @keyframes logo-flash {
          0%, 50% { opacity: 0; }
          58% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__breathe, .logo-glow__bolt, .logo-glow__flash, .logo-glow__ticks, .logo-glow__spark { animation: none; }
          .logo-glow__bolt, .logo-glow__flash, .logo-glow__ticks, .logo-glow__spark { opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
