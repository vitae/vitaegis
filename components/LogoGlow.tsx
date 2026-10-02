'use client';

import { useId } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   Built from the three ideas behind the 2026 console boot mark:
     1. A glass orb: a sphere of green glass behind the letters, dark in the body,
        lit from the upper left, with a bright rim and a caustic pool of light that
        drifts slowly inside it.
     2. Specular highlights: a soft white hot-spot on the orb's upper curve, and a
        band of light that sweeps across both the orb and the lettering.
     3. An acid-green glow: light bleeding off the orb onto black, brighter and more
        yellow than the brand green, breathing slowly.
   The letters themselves stay white glass so they carry the mark. SVG gradients,
   filters and SMIL/CSS animation only: no canvas, no per-frame JavaScript, and it
   rests under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
}

const W = 1000;
const H = 400;
const CX = W / 2;
const CY = 200;
const R = 165; // orb radius
const BASE_Y = CY + 52; // baseline that centres 150px capitals on the orb

const GREEN = '#00FF00';
const ACID = '#B4FF1A';

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
        {/* ── the orb ─────────────────────────────────────────────────────────── */}
        {/* Body: lit from the upper left, dark glass through the middle, deep at the far rim. */}
        <radialGradient id={`${id}-body`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#2BFF2B" />
          <stop offset="0.25" stopColor="#0FB80F" />
          <stop offset="0.6" stopColor="#064D06" />
          <stop offset="0.92" stopColor="#031F03" />
          <stop offset="1" stopColor="#0A8A0A" />
        </radialGradient>
        {/* Caustic: a pool of light inside the glass that drifts around the lower half. */}
        <radialGradient id={`${id}-caustic`} cx="0.5" cy="0.78" r="0.42">
          <stop offset="0" stopColor={ACID} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={GREEN} stopOpacity="0.18" />
          <stop offset="1" stopColor={GREEN} stopOpacity="0" />
          <animate
            attributeName="cx"
            values="0.5;0.62;0.42;0.5"
            dur="11s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="0.78;0.68;0.74;0.78"
            dur="11s"
            repeatCount="indefinite"
          />
        </radialGradient>
        {/* Rim light: bright at the very edge, clear inside, like light bending round the sphere. */}
        <radialGradient id={`${id}-rim`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.86" stopColor={ACID} stopOpacity="0" />
          <stop offset="0.96" stopColor={ACID} stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
        </radialGradient>
        {/* Hot-spot: the soft specular on the upper curve. */}
        <radialGradient id={`${id}-hot`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Acid glow bleeding off the orb onto black. */}
        <radialGradient id={`${id}-bleed`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stopColor={ACID} stopOpacity="0.5" />
          <stop offset="0.6" stopColor={GREEN} stopOpacity="0.14" />
          <stop offset="1" stopColor={GREEN} stopOpacity="0" />
        </radialGradient>
        {/* The sweep: a band of white that crosses the orb and the letters together. */}
        <linearGradient
          id={`${id}-sweep`}
          gradientUnits="userSpaceOnUse"
          x1="-360"
          y1="0"
          x2="-120"
          y2="400"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animate
            attributeName="x1"
            values="-360;1200"
            dur="6s"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate
            attributeName="x2"
            values="-120;1440"
            dur="6s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </linearGradient>
        <clipPath id={`${id}-orb`}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>

        {/* ── the letters ─────────────────────────────────────────────────────── */}
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#F4FFF2" />
          <stop offset="0.85" stopColor="#C9FFC9" />
          <stop offset="1" stopColor="#7DFF7D" />
        </linearGradient>
        <filter id={`${id}-blur-xl`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <filter id={`${id}-blur-m`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${id}-blur-s`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* 3. Acid glow bleeding onto black, breathing. */}
      <circle
        cx={CX}
        cy={CY}
        r={R * 1.9}
        fill={`url(#${id}-bleed)`}
        className="logo-glow__breathe"
      />

      {/* 1. The glass orb. */}
      <g className="logo-glow__float">
        <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-body)`} />
        <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-caustic)`} />
        <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-rim)`} />
        {/* 2. Specular hot-spot on the upper curve, softened. */}
        <ellipse
          cx={CX - 58}
          cy={CY - 92}
          rx={70}
          ry={34}
          fill={`url(#${id}-hot)`}
          filter={`url(#${id}-blur-s)`}
          transform={`rotate(-18 ${CX - 58} ${CY - 92})`}
        />
        {/* The sweep across the orb, kept inside its edge. */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill={`url(#${id}-sweep)`}
          clipPath={`url(#${id}-orb)`}
          style={{ mixBlendMode: 'screen' }}
          opacity="0.55"
        />
      </g>

      {/* The letters: a soft green glow behind white glass, then the same sweep over them. */}
      <g filter={`url(#${id}-blur-m)`} opacity="0.55">
        {mark(GREEN)}
      </g>
      {mark(`url(#${id}-glass)`)}
      {mark(`url(#${id}-sweep)`, { style: { mixBlendMode: 'screen' } })}

      <style>{`
        .logo-glow { filter: drop-shadow(0 0 18px rgba(0,255,0,0.25)); }
        .logo-glow__breathe { animation: logo-breathe 5s ease-in-out infinite; }
        .logo-glow__float { animation: logo-float 7s ease-in-out infinite; transform-origin: 50% 50%; }
        @keyframes logo-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes logo-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.015); } }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__breathe, .logo-glow__float { animation: none; }
        }
      `}</style>
    </svg>
  );
}
