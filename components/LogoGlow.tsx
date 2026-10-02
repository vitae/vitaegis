'use client';

import { useEffect, useId, useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   The mark as lit glass, the way the 2026 console boot logos are built: a deep
   glow bleeding onto black, a body shaded pale at the top to deep green at the base,
   a specular highlight that sweeps across the surface, and a bright core. On top of
   that, lightning: a bolt is traced through the letters every few seconds (clipped to
   the glyphs so it reads as current running inside the glass), with a flash of the
   whole mark as it strikes.
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

/** A jagged path from (x0,y0) to (x1,y1) with a few short forks. */
function bolt(seed: number, x0: number, y0: number, x1: number, y1: number) {
  const segments = 14;
  const pts: [number, number][] = [[x0, y0]];
  for (let i = 1; i < segments; i++) {
    const f = i / segments;
    const jitter = (hash(seed, i) - 0.5) * 70;
    pts.push([x0 + (x1 - x0) * f + (hash(seed, i + 100) - 0.5) * 30, y0 + (y1 - y0) * f + jitter]);
  }
  pts.push([x1, y1]);
  const main = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const forks: string[] = [];
  for (let k = 0; k < 3; k++) {
    const at = 3 + Math.floor(hash(seed, 200 + k) * (segments - 6));
    const [fx, fy] = pts[at];
    const dir = hash(seed, 300 + k) > 0.5 ? 1 : -1;
    forks.push(
      `M${fx.toFixed(1)} ${fy.toFixed(1)}` +
        `L${(fx + 30 * dir).toFixed(1)} ${(fy + (hash(seed, 400 + k) - 0.5) * 60).toFixed(1)}` +
        `L${(fx + 55 * dir).toFixed(1)} ${(fy + (hash(seed, 500 + k) - 0.5) * 90).toFixed(1)}`,
    );
  }
  return { main, forks };
}

export default function LogoGlow({ text = 'VITAEGIS', className = '' }: Props) {
  const id = useId().replace(/:/g, '');
  const [strike, setStrike] = useState(0);

  // A new bolt every 2.4–4 s; the seed picks its shape and where it enters and leaves.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const next = () => {
      setStrike((s) => s + 1);
      timer = window.setTimeout(next, 2400 + Math.random() * 1600);
    };
    timer = window.setTimeout(next, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const bolts = useMemo(() => {
    const seed = strike * 7919 + 13;
    const leftToRight = hash(seed, 1) > 0.5;
    const yIn = 40 + hash(seed, 2) * 140;
    const yOut = 40 + hash(seed, 3) * 140;
    return bolt(seed, leftToRight ? 0 : W, yIn, leftToRight ? W : 0, yOut);
  }, [strike]);

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

      {/* Lightning inside the glass, and a faint flash across the whole mark with it. */}
      <g key={strike} className="logo-glow__strike">
        {mark('#FFFFFF', { className: 'logo-glow__flash' })}
        <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-bolt)`} className="logo-glow__bolt">
          <path
            d={bolts.main}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={bolts.main}
            fill="none"
            stroke="#CCFFCC"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {bolts.forks.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>
        <g filter={`url(#${id}-bolt)`} opacity="0.35" className="logo-glow__bolt">
          <path
            d={bolts.main}
            fill="none"
            stroke="#00FF00"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      </g>

      <style>{`
        .logo-glow { filter: drop-shadow(0 0 24px rgba(0,255,0,0.35)); }
        .logo-glow__breathe { animation: logo-breathe 4s ease-in-out infinite; transform-origin: 50% 50%; }
        .logo-glow__bolt {
          stroke-dasharray: 2600;
          stroke-dashoffset: 2600;
          opacity: 0;
          animation: logo-bolt 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
        }
        .logo-glow__flash { opacity: 0; animation: logo-flash 1.1s ease-out forwards; mix-blend-mode: screen; }
        @keyframes logo-breathe { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes logo-bolt {
          0% { stroke-dashoffset: 2600; opacity: 1; }
          45% { stroke-dashoffset: 0; opacity: 1; }
          60% { opacity: 0.9; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes logo-flash {
          0% { opacity: 0; }
          40% { opacity: 0; }
          48% { opacity: 0.55; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__breathe, .logo-glow__bolt, .logo-glow__flash { animation: none; }
          .logo-glow__bolt, .logo-glow__flash { opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
