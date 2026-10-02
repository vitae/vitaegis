'use client';

import { useId } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   Modelled frame by frame on the 2026 Xbox boot animation (PROJECTS/VITAEGIS/xbox-ref):
     0.0–1.6 s  The mark scales up from about half size out of the dark.
     0.6–2.1 s  The glass fills from the bottom up: translucent, then solid, pale
                green at the base shading to deep green at the top.
     2.1 s →    Settle: solid lit glass with a slow specular sweep.
   No outline pass and no bevel bands: on a wordmark those read as boxes inside the
   A and E, so the letters are left as clean lit shapes.
   Kept cheap on purpose: one blurred layer for the glow, and only opacity and
   transform animate, so
   phones composite it without re-rastering filters. No per-frame JavaScript;
   reduced-motion shows the settled state.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
}

const W = 1000;
const H = 300;
const CX = W / 2;
const BASE_Y = 240; // text baseline

// Brand green and its tints: the base glows almost white-green, the top sits in shadow.
const ACID = '#66FF66';
const LIME = '#00FF00';
const DEEP = '#00A300';

export default function LogoGlow({ text = 'VITAEGIS', className = '' }: Props) {
  const id = useId().replace(/:/g, '');

  const mark = (fill: string, extra: React.SVGProps<SVGTextElement> = {}) => (
    <text
      x={CX}
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
        {/* Glass body, lit from below: acid at the base, deep green at the top. */}
        <linearGradient id={`${id}-glass`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={ACID} />
          <stop offset="0.3" stopColor={LIME} />
          <stop offset="0.75" stopColor={DEEP} />
          <stop offset="1" stopColor="#006B00" />
        </linearGradient>
        {/* The fill rising through the glass during the entrance. */}
        <linearGradient id={`${id}-rise`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Specular band that crosses the glass every few seconds. */}
        <linearGradient
          id={`${id}-sweep`}
          gradientUnits="userSpaceOnUse"
          x1="-400"
          y1="0"
          x2="-160"
          y2="420"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animate
            attributeName="x1"
            values="-400;1200"
            dur="7s"
            repeatCount="indefinite"
            begin="3s"
          />
          <animate
            attributeName="x2"
            values="-160;1440"
            dur="7s"
            repeatCount="indefinite"
            begin="3s"
          />
        </linearGradient>
        <mask id={`${id}-risemask`}>
          <rect
            className="logo-glow__rise"
            x="0"
            y="0"
            width={W}
            height={H}
            fill={`url(#${id}-rise)`}
          />
        </mask>
        <filter id={`${id}-glow`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* Everything that scales in with the entrance. */}
      <g className="logo-glow__mark">
        {/* Phase 2 and 3: the glass filling from the bottom, then its bevels. */}
        <g className="logo-glow__glass" mask={`url(#${id}-risemask)`}>
          <g filter={`url(#${id}-glow)`} opacity="0.45">
            {mark(LIME)}
          </g>
          {mark(`url(#${id}-glass)`)}
          {mark(`url(#${id}-sweep)`, { style: { mixBlendMode: 'screen' } })}
        </g>
      </g>

      <style>{`
        .logo-glow__mark, .logo-glow__glass { will-change: opacity, transform; }
        .logo-glow__mark { transform-box: fill-box; transform-origin: 50% 60%; animation: lg-scale 1.7s cubic-bezier(0.2,0.6,0.2,1) both; }
        .logo-glow__glass { animation: lg-glass 1.3s ease-out 0.6s both; }
        .logo-glow__rise { animation: lg-rise 1.5s cubic-bezier(0.3,0.6,0.3,1) 0.6s both; }
        @keyframes lg-scale { 0% { transform: scale(0.52); } 100% { transform: scale(1); } }
        @keyframes lg-glass { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes lg-rise { 0% { transform: translateY(260px); } 100% { transform: translateY(-40px); } }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__mark, .logo-glow__glass, .logo-glow__rise { animation: none; }
          .logo-glow__rise { transform: translateY(-40px); }
        }
      `}</style>
    </svg>
  );
}
