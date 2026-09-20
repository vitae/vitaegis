'use client';

// The radar console: the 3D scope, its HUD chrome, and the flight strips that drive it.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { airports, legs, legMiles, rejected, travelers } from './data';

const RadarGlobe = dynamic(() => import('./RadarGlobe'), {
  ssr: false,
  loading: () => <ScopeMessage>Acquiring signal…</ScopeMessage>,
});

const ZONES: Record<string, string> = {
  HNL: 'Pacific/Honolulu',
  NRT: 'Asia/Tokyo',
  PVG: 'Asia/Shanghai',
  BKK: 'Asia/Bangkok',
  HAN: 'Asia/Ho_Chi_Minh',
  SGN: 'Asia/Ho_Chi_Minh',
  DPS: 'Asia/Makassar',
  ICN: 'Asia/Seoul',
};

const hud = 'text-[10px] font-medium uppercase tracking-[0.22em] sm:text-[11px]';

function ScopeMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex h-full w-full items-center justify-center text-vitae-green/70 ${hud}`}>{children}</div>
  );
}

function clock(zone: string, now: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Range rings, crosshair and bearing ticks, drawn over the globe. */
function ScopeChrome() {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="#00ff00">
        {[24.5, 49, 73.5].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} strokeOpacity="0.16" strokeWidth="0.3" strokeDasharray="1 1.6" />
        ))}
        <circle cx="100" cy="100" r="98" strokeOpacity="0.55" strokeWidth="0.5" />
        <path d="M100 2V198M2 100H198" strokeOpacity="0.13" strokeWidth="0.3" />
        {ticks.map((deg) => {
          const major = deg % 30 === 0;
          return (
            <line
              key={deg}
              x1="100" x2="100" y1="2" y2={major ? 5 : 3.6}
              strokeOpacity={major ? 0.8 : 0.4}
              strokeWidth={major ? 0.5 : 0.3}
              transform={`rotate(${deg} 100 100)`}
            />
          );
        })}
      </g>
      <g fill="#00ff00" fillOpacity="0.6" fontSize="3.4" fontFamily="Jost, sans-serif" textAnchor="middle" letterSpacing="0.4">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180;
          // Fixed precision so the server and client render identical strings (hydration).
          return (
            <text key={deg} x={(100 + Math.cos(a) * 91.5).toFixed(2)} y={(100 + Math.sin(a) * 91.5 + 1.3).toFixed(2)}>
              {String(deg).padStart(3, '0')}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

export default function RadarConsole() {
  const [selected, setSelected] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(true);
  const [still, setStill] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!scope.current) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(scope.current);
    return () => io.disconnect();
  }, []);

  // Demo loop: overview first, then walk the legs until someone takes the controls.
  useEffect(() => {
    if (!auto || still || !inView) return;
    const id = window.setTimeout(
      () => setSelected((s) => (s === null ? 0 : s === legs.length - 1 ? null : s + 1)),
      selected === null ? 4200 : 5200
    );
    return () => window.clearTimeout(id);
  }, [auto, still, inView, selected]);

  // Clicking the lit strip clears it — unless the demo loop lit it, in which case the click keeps it.
  const pick = (i: number | null) => {
    setSelected(auto || i !== selected ? i : null);
    setAuto(false);
  };

  const leg = selected === null ? null : legs[selected];
  const destZone = leg ? ZONES[leg.to] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* ── Scope ── */}
      <div className="relative mx-auto w-full max-w-[640px]">
        <div className={`mb-3 flex items-start justify-between gap-4 text-vitae-green ${hud}`}>
          <div>
            <p>
              VTGS Approach<span className="hidden sm:inline"> · Pacific sector</span>
            </p>
            <p className="mt-1 text-white/45">
              Scope 01 · {legs.length} tracks<span className="hidden lg:inline"> · drag to turn</span>
            </p>
          </div>
          <div className="text-right tabular-nums">
            <p>
              HNL <span className="text-white">{now ? clock(ZONES.HNL, now) : '--:--:--'}</span>
            </p>
            <p className="mt-1 text-white/45">
              {leg && destZone ? (
                <>
                  {leg.to} <span className="text-[#ff00ff]">{now ? clock(destZone, now) : '--:--:--'}</span>
                </>
              ) : (
                <>
                  UTC <span className="text-white/70">{now ? clock('UTC', now) : '--:--:--'}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div
          ref={scope}
          className="relative aspect-square w-full overflow-hidden rounded-full bg-black shadow-[0_0_60px_rgba(0,255,0,0.14),inset_0_0_80px_rgba(0,255,0,0.08)]"
        >
          <div className="absolute inset-0">
            {webgl ? (
              <RadarGlobe selected={selected} running={inView} still={still} />
            ) : (
              <ScopeMessage>3D scope needs WebGL — the strips still work</ScopeMessage>
            )}
          </div>
          {!still && <div className="travel-sweep pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
          <div className="travel-scanlines pointer-events-none absolute inset-0 rounded-full" aria-hidden />
          <ScopeChrome />
        </div>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-white/55 ${hud}`}>
          <span className="flex items-center gap-2">
            <i className="h-px w-6 bg-vitae-green shadow-[0_0_6px_#00ff00]" /> Booked track
          </span>
          <span className="flex items-center gap-2">
            <i className="h-px w-6 bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" /> Selected
          </span>
          <span className="flex items-center gap-2">
            <i className="h-px w-6 border-t border-dashed border-[#ff0000]" /> Rejected · {rejected.from}→{rejected.to} direct
          </span>
        </div>
      </div>

      {/* ── Flight strips ── */}
      <div>
        <div className={`mb-3 flex items-baseline justify-between text-vitae-green ${hud}`}>
          <h2>Flight strips</h2>
          <button
            type="button"
            onClick={() => pick(null)}
            className={`rounded-full border px-3 py-1 transition ${
              selected === null
                ? 'border-vitae-green/60 bg-vitae-green/10 text-vitae-green'
                : 'border-white/15 text-white/55 hover:border-vitae-green/60 hover:text-vitae-green'
            } ${hud}`}
          >
            Full circuit
          </button>
        </div>
        <ol className="space-y-1.5">
          {legs.map((l, i) => {
            const on = selected === i;
            return (
              <li key={l.n}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(i)}
                  className={`group w-full rounded-xl border px-3 py-2.5 text-left transition sm:px-4 ${
                    on
                      ? 'border-[#ff00ff]/70 bg-[#ff00ff]/[0.07] shadow-[0_0_24px_rgba(255,0,255,0.12)]'
                      : 'border-vitae-green/20 bg-white/[0.025] hover:border-vitae-green/60 hover:bg-vitae-green/[0.05]'
                  }`}
                >
                  <span className="flex items-baseline gap-3">
                    <span className={`w-5 text-xs tabular-nums ${on ? 'text-[#ff00ff]' : 'text-vitae-green/70'}`}>{l.n}</span>
                    <span className="text-base font-semibold tracking-[0.12em] text-white sm:text-lg">
                      {l.from}
                      <span className={`mx-2 ${on ? 'text-[#ff00ff]' : 'text-vitae-green'}`}>→</span>
                      {l.toLabel ?? l.to}
                    </span>
                    <span className="ml-auto hidden text-xs tabular-nums tracking-wider text-white/45 sm:inline">
                      {legMiles(l).toLocaleString('en-US')} mi
                    </span>
                    <span className="ml-auto w-14 text-right text-base font-semibold tabular-nums text-vitae-green sm:ml-0">
                      ${l.farePP}
                    </span>
                  </span>
                  <span className="mt-0.5 block pl-8 text-sm font-light text-white/55">
                    {airports[l.from].city} → {airports[l.to].city} · {l.time}
                  </span>
                  {on && (
                    <span className="mt-2 block border-t border-[#ff00ff]/25 pl-8 pt-2 text-sm font-light leading-relaxed text-white/80">
                      <span className={`block text-white/50 ${hud}`}>{l.carriers}</span>
                      <span className={`mt-1.5 block ${l.flag === 'visa' ? 'text-[#ffff00]' : ''}`}>{l.note}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <p className={`mt-3 flex items-baseline justify-between px-1 text-white/55 ${hud}`}>
          <span>Per person, one-way · ×{travelers} travelers</span>
        </p>
      </div>
    </div>
  );
}
