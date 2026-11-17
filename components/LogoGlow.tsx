import { useId } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Glowing wordmark
   Solid lit glass, pale green at the base shading to deep green at the top, with a slow
   specular sweep. It is drawn in its final state with the first paint: no entrance.
   No outline pass and no bevel bands: on a wordmark those read as boxes inside the
   A and E, so the letters are left as clean lit shapes. One blurred layer for the glow.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  text?: string;
  className?: string;
  /** Stretch the letters to this width (viewBox units), so any word spans what VITAEGIS does. */
  inkWidth?: number;
}

const W = 1000;
const H = 300;
const CX = W / 2;
const BASE_Y = 240; // text baseline

// Brand green and its tints: the base glows almost white-green, the top sits in shadow.
const ACID = '#66FF66';
const LIME = '#00FF00';
const DEEP = '#00A300';

export default function LogoGlow({ text = 'VITAEGIS', className = '', inkWidth }: Props) {
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
      {...(inkWidth ? { textLength: inkWidth, lengthAdjust: 'spacing' as const } : {})}
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
        {/* Fades the glass out toward the top of the letters. */}
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

      <style>{`.logo-glow__rise { transform: translateY(-40px); }`}</style>
    </svg>
  );
}
