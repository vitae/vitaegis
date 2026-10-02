'use client';

import { useId } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   Modelled frame by frame on the 2026 Xbox boot animation (PROJECTS/VITAEGIS/xbox-ref):
     0.0–1.6 s  Only the bevel edges catch light: a thin acid-green outline of the
                mark, scaling up from about half size while it brightens.
     1.0 s      A point of light appears beneath the mark and a band of green light
                pools on the floor under it.
     1.6–2.6 s  The glass fills from the bottom up: translucent, then solid, bright
                acid green at the base shading to deep green at the top.
     2.6 s →    Settle: thick beveled glass with a white highlight along the upper
                edges, an inner dark edge, the floor glow breathing, a slow sweep.
   Behind the letters sits a dark glass sphere lit from below, so the mark reads as
   pieces in front of an orb the way the Xbox segments do. SVG filters and CSS
   keyframes only, no per-frame JavaScript; reduced-motion shows the settled state.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
}

const W = 1000;
const H = 420;
const CX = W / 2;
const BASE_Y = 240; // text baseline
const ORB_Y = 190;
const ORB_R = 170;
const FLOOR_Y = 352;

const ACID = '#B4FF1A';
const LIME = '#8FDC00';
const DEEP = '#2E7A00';
const DARK = '#0E2B00';

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
          <stop offset="1" stopColor="#1C4D00" />
        </linearGradient>
        {/* The fill rising through the glass during the entrance. */}
        <linearGradient id={`${id}-rise`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* The orb behind: dark glass, a little light from the floor at its base. */}
        <radialGradient id={`${id}-orb`} cx="0.5" cy="0.95" r="0.9">
          <stop offset="0" stopColor={DEEP} stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#163D00" stopOpacity="0.8" />
          <stop offset="0.8" stopColor="#061200" stopOpacity="0.85" />
          <stop offset="1" stopColor="#030A00" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${id}-orbrim`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.9" stopColor={LIME} stopOpacity="0" />
          <stop offset="0.975" stopColor={LIME} stopOpacity="0.35" />
          <stop offset="1" stopColor={ACID} stopOpacity="0.7" />
        </radialGradient>
        {/* Floor light: a wide band pooling under the mark, and the point beneath it. */}
        <radialGradient id={`${id}-floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={LIME} stopOpacity="0.85" />
          <stop offset="0.45" stopColor={DEEP} stopOpacity="0.45" />
          <stop offset="1" stopColor={DEEP} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-point`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.25" stopColor={ACID} stopOpacity="0.9" />
          <stop offset="1" stopColor={ACID} stopOpacity="0" />
        </radialGradient>
        {/* Room haze: the faint green fog behind everything. */}
        <radialGradient id={`${id}-haze`} cx="0.5" cy="0.75" r="0.7">
          <stop offset="0" stopColor={DEEP} stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
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
        <clipPath id={`${id}-letters`}>{mark('#fff')}</clipPath>
        {/* Bevel bands: the letters minus a copy shifted down (upper edges) or up (lower edges). */}
        <mask id={`${id}-top`}>
          {mark('#fff')}
          {mark('#000', { transform: 'translate(0 5)' })}
        </mask>
        <mask id={`${id}-bottom`}>
          {mark('#fff')}
          {mark('#000', { transform: 'translate(0 -6)' })}
        </mask>
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
        <filter id={`${id}-soft`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={`${id}-glow`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`${id}-wide`} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      {/* Room and floor. */}
      <rect
        x="0"
        y="0"
        width={W}
        height={H}
        fill={`url(#${id}-haze)`}
        className="logo-glow__late"
      />
      <ellipse
        cx={CX}
        cy={FLOOR_Y}
        rx={420}
        ry={34}
        fill={`url(#${id}-floor)`}
        filter={`url(#${id}-wide)`}
        className="logo-glow__floor"
      />
      <ellipse
        cx={CX}
        cy={FLOOR_Y - 14}
        rx={30}
        ry={6}
        fill={`url(#${id}-point)`}
        className="logo-glow__point"
      />

      {/* The orb behind the mark. */}
      <g className="logo-glow__late">
        <circle cx={CX} cy={ORB_Y} r={ORB_R} fill={`url(#${id}-orb)`} />
        <circle cx={CX} cy={ORB_Y} r={ORB_R} fill={`url(#${id}-orbrim)`} />
      </g>

      {/* Everything that scales in with the entrance. */}
      <g className="logo-glow__mark">
        {/* Phase 1: the bevel edges catching light. */}
        <g className="logo-glow__edge">
          {mark('none', {
            stroke: ACID,
            strokeWidth: 2.5,
            strokeLinejoin: 'round',
            filter: `url(#${id}-soft)`,
            opacity: 0.9,
          })}
          {mark('none', { stroke: '#E8FFB0', strokeWidth: 1 })}
        </g>

        {/* Phase 2 and 3: the glass filling from the bottom, then its bevels. */}
        <g className="logo-glow__glass" mask={`url(#${id}-risemask)`}>
          <g filter={`url(#${id}-glow)`} opacity="0.5">
            {mark(LIME)}
          </g>
          {mark(`url(#${id}-glass)`)}
          {/* Inner dark edge, then the white bevel on the upper edges and acid on the lower. */}
          {mark('none', {
            stroke: DARK,
            strokeWidth: 3,
            strokeLinejoin: 'round',
            clipPath: `url(#${id}-letters)`,
            opacity: 0.55,
          })}
          <rect
            x="0"
            y="0"
            width={W}
            height={H}
            fill="#FFFFFF"
            mask={`url(#${id}-top)`}
            opacity="0.9"
          />
          <rect
            x="0"
            y="0"
            width={W}
            height={H}
            fill={ACID}
            mask={`url(#${id}-bottom)`}
            opacity="0.95"
          />
          {mark(`url(#${id}-sweep)`, { style: { mixBlendMode: 'screen' } })}
        </g>
      </g>

      <style>{`
        .logo-glow { filter: drop-shadow(0 10px 24px rgba(143,220,0,0.18)); }
        .logo-glow__mark { transform-box: fill-box; transform-origin: 50% 60%; animation: lg-scale 1.7s cubic-bezier(0.2,0.6,0.2,1) both; }
        .logo-glow__edge { animation: lg-edge 2.8s ease-out both; }
        .logo-glow__glass { animation: lg-glass 1.3s ease-out 1.5s both; }
        .logo-glow__rise { animation: lg-rise 1.4s cubic-bezier(0.3,0.6,0.3,1) 1.5s both; }
        .logo-glow__point { animation: lg-point 1.4s ease-out 0.9s both, lg-breathe 4s ease-in-out 2.4s infinite; }
        .logo-glow__floor { animation: lg-floor 1.6s ease-out 1s both, lg-breathe 4s ease-in-out 2.6s infinite; }
        .logo-glow__late { animation: lg-late 1.2s ease-out 1.4s both; }
        @keyframes lg-scale { 0% { transform: scale(0.52); } 100% { transform: scale(1); } }
        @keyframes lg-edge { 0% { opacity: 0; } 20% { opacity: 0.35; } 60% { opacity: 1; } 100% { opacity: 0.35; } }
        @keyframes lg-glass { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes lg-rise { 0% { transform: translateY(260px); } 100% { transform: translateY(-40px); } }
        @keyframes lg-point { 0% { opacity: 0; transform: scale(0.2); transform-box: fill-box; transform-origin: center; } 100% { opacity: 1; transform: scale(1); } }
        @keyframes lg-floor { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes lg-late { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes lg-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.72; } }
        @media (prefers-reduced-motion: reduce) {
          .logo-glow__mark, .logo-glow__edge, .logo-glow__glass, .logo-glow__rise, .logo-glow__point, .logo-glow__floor, .logo-glow__late { animation: none; }
          .logo-glow__edge { opacity: 0.35; }
          .logo-glow__rise { transform: translateY(-40px); }
        }
      `}</style>
    </svg>
  );
}
