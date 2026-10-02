'use client';

import { useId } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   The mark as lit glass, the way the 2026 console boot logos are built: white
   lettering with a soft green glow bleeding onto black, a body shaded from white at
   the top through pale green to a green base, and a specular highlight that sweeps
   across the surface every few seconds. SVG filters and CSS animation only: no canvas,
   no per-frame JavaScript, and it rests under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
}

const W = 1000;
const H = 220;
const BASE_Y = 160;

export default function LogoGlow({ text = 'VITAEGIS', className = '' }: Props) {
  const id = useId().replace(/:/g, '');

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
        {/* Glass body: white at the top, pale green through the middle, green at the base. */}
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#F2FFF0" />
          <stop offset="0.8" stopColor="#B9FFB9" />
          <stop offset="1" stopColor="#4DFF4D" />
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
          <stop offset="0" stopColor="#00FF00" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#00FF00" stopOpacity="0.06" />
          <stop offset="1" stopColor="#00FF00" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-deep`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id={`${id}-mid`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
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
      <g filter={`url(#${id}-deep)`} opacity="0.4" className="logo-glow__breathe">
        {mark('#00FF00')}
      </g>
      <g filter={`url(#${id}-mid)`} opacity="0.5">
        {mark('#00FF00')}
      </g>

      {/* The glass body and its highlight. */}
      {mark(`url(#${id}-glass)`)}
      {mark(`url(#${id}-spec)`, { style: { mixBlendMode: 'screen' } })}

      <style>{`
        .logo-glow { filter: drop-shadow(0 0 14px rgba(0,255,0,0.22)); }
        .logo-glow__breathe { animation: logo-breathe 5s ease-in-out infinite; }
        @keyframes logo-breathe { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__breathe { animation: none; }
        }
      `}</style>
    </svg>
  );
}
