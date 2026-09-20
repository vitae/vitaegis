'use client';

// The radar console: the 3D scope, its HUD chrome, and the flight strips that drive it.
// Route data comes in as props, so each page under /travel can run its own sector.

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { legMiles, waypoints, type Airports, type Leg, type Overview, type Rejected } from './geo';

const RadarGlobe = dynamic(() => import('./RadarGlobe'), {
  ssr: false,
  loading: () => <ScopeMessage>Acquiring signal…</ScopeMessage>,
});

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

export interface RadarConsoleProps {
  airports: Airports;
  legs: Leg[];
  rejected?: Rejected;
  /** Origin airport code. */
  home: string;
  overview: Overview;
  /** Shown on the strip footer as "×N travelers" when more than one. */
  travelers?: number;
  /** HUD header, e.g. "Pacific sector". */
  sector: string;
  /** HUD header, e.g. "Scope 01". */
  scope: string;
  /** Optional sector selector. Legs carry a matching `region` key. A region's own `overview` re-frames the scope and its `sector` replaces the HUD header when it is picked. */
  regions?: { key: string; label: string; blurb?: string; sector?: string; overview?: Overview; rank?: number; miles?: number; color?: string; nonstop?: boolean }[];
  /** Extra legend swatches, for colour-coded tracks (legs with a `hue`). */
  legend?: { color: string; label: string }[];
}

export default function RadarConsole({ airports, legs, rejected, home, overview, travelers = 1, sector, scope, regions, legend }: RadarConsoleProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(true);
  const [still, setStill] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => (region ? legs.map((l) => l.region === region) : undefined), [legs, region]);
  const shown = useMemo(() => legs.map((l, i) => i).filter((i) => !active || active[i]), [legs, active]);

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
    if (!scopeRef.current) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(scopeRef.current);
    return () => io.disconnect();
  }, []);

  // Demo loop: overview first, then walk the visible legs until someone takes the controls.
  useEffect(() => {
    if (!auto || still || !inView || shown.length === 0) return;
    const id = window.setTimeout(
      () =>
        setSelected((s) => {
          const at = s === null ? -1 : shown.indexOf(s);
          return at === shown.length - 1 ? null : shown[at + 1];
        }),
      selected === null ? 4200 : 5200
    );
    return () => window.clearTimeout(id);
  }, [auto, still, inView, selected, shown]);

  // Clicking the lit strip clears it — unless the demo loop lit it, in which case the click keeps it.
  const pick = (i: number | null) => {
    setSelected(auto || i !== selected ? i : null);
    setAuto(false);
  };

  const filter = (key: string | null) => {
    setRegion(key);
    setSelected(null);
    setHovered(null);
  };

  /** Any hands-on input takes the scope out of demo mode. */
  const takeControls = () => setAuto(false);

  const leg = selected === null ? null : legs[selected];
  const destZone = leg ? airports[leg.to].tz : null;
  const picked = region ? regions?.find((r) => r.key === region) : undefined;
  const framing = picked?.overview ?? overview;
  const sectorName = picked?.sector ?? sector;

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 transition ${
      on ? 'border-vitae-green/60 bg-vitae-green/10 text-vitae-green' : 'border-white/15 text-white/55 hover:border-vitae-green/60 hover:text-vitae-green'
    } ${hud}`;

  return (
    <div>
      {/* ── Sector selector ── */}
      {regions && (
        <div className="mb-6" role="group" aria-label="Sector">
          <div className={`mb-3 flex items-baseline justify-between text-vitae-green ${hud}`}>
            <h2>Sectors</h2>
            <button type="button" aria-pressed={region === null} onClick={() => filter(null)} className={chip(region === null)}>
              All sectors · {legs.length} tracks
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {regions.map((r) => {
              const on = region === r.key;
              const count = legs.filter((l) => l.region === r.key).length;
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => filter(on ? null : r.key)}
                  style={on && r.color ? { borderColor: r.color, boxShadow: `0 0 24px ${r.color}33`, backgroundColor: `${r.color}14` } : undefined}
                  className={`group rounded-xl border px-3 py-3 text-left transition ${
                    on
                      ? 'border-[#ff00ff]/70 bg-[#ff00ff]/[0.07] shadow-[0_0_24px_rgba(255,0,255,0.12)]'
                      : 'border-vitae-green/20 bg-white/[0.025] hover:border-vitae-green/60 hover:bg-vitae-green/[0.05]'
                  }`}
                >
                  <span
                    style={r.color ? { color: r.color } : undefined}
                    className={`flex justify-between tabular-nums ${on ? 'text-[#ff00ff]' : 'text-vitae-green/70'} ${hud}`}
                  >
                    <span>{r.rank ? `#${r.rank}` : `${count} ${count === 1 ? 'track' : 'tracks'}`}</span>
                    {r.miles !== undefined && <span>{r.miles.toLocaleString('en-US')} mi</span>}
                  </span>
                  <span className="mt-1 block text-base font-semibold tracking-[0.08em] text-white">{r.label}</span>
                  {r.rank && (
                    <span className="mt-0.5 block text-xs text-white/45">
                      {count} {count === 1 ? 'track' : 'tracks'}{r.nonstop ? ' · nonstop' : ''}
                    </span>
                  )}
                  {r.blurb && <span className="mt-1.5 hidden text-xs font-light leading-relaxed text-white/55 lg:block">{r.blurb}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* ── Scope ── */}
      <div className="relative mx-auto w-full max-w-[640px]">
        <div className={`mb-3 flex items-start justify-between gap-4 text-vitae-green ${hud}`}>
          <div>
            <p>
              VTGS Approach<span className="hidden sm:inline"> · {sectorName}</span>
            </p>
            <p className="mt-1 text-white/45">
              {scope} · {shown.length} tracks{picked ? ' lit' : ''}<span className="hidden lg:inline"> · drag to turn · click a track to lock</span>
            </p>
          </div>
          <div className="text-right tabular-nums">
            <p>
              {home} <span className="text-white">{now ? clock(airports[home].tz, now) : '--:--:--'}</span>
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
          ref={scopeRef}
          className="relative aspect-square w-full overflow-hidden rounded-full bg-black shadow-[0_0_60px_rgba(0,255,0,0.14),inset_0_0_80px_rgba(0,255,0,0.08)]"
        >
          <div className="absolute inset-0">
            {webgl ? (
              <RadarGlobe
                airports={airports}
                legs={legs}
                rejected={rejected}
                home={home}
                overview={framing}
                active={active}
                selected={selected}
                hovered={hovered}
                running={inView}
                still={still}
                onHover={setHovered}
                onSelect={pick}
                onDrag={takeControls}
              />
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
          {legend?.map((g) => (
            <span key={g.label} className="flex items-center gap-2">
              <i className="h-px w-6" style={{ backgroundColor: g.color, boxShadow: `0 0 6px ${g.color}` }} /> {g.label}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <i className="h-px w-6 bg-white shadow-[0_0_6px_#fff]" /> Hover
          </span>
          <span className="flex items-center gap-2">
            <i className="h-px w-6 bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" /> Selected
          </span>
          {rejected && (
            <span className="flex items-center gap-2">
              <i className="h-px w-6 border-t border-dashed border-[#ff0000]" /> Rejected · {rejected.from}→{rejected.to} direct
            </span>
          )}
          <span className="flex items-center gap-2">
            <i className="h-2 w-2 border border-vitae-green/80 shadow-[0_0_6px_#00ff00]" /> Track · FL · GS · HDG · ETA
          </span>
        </div>
      </div>

      {/* ── Flight strips ── */}
      <div>
        <div className={`mb-3 flex items-baseline justify-between text-vitae-green ${hud}`}>
          <h2>Flight strips</h2>
          <button type="button" onClick={() => pick(null)} className={chip(selected === null)}>
            {regions ? (picked ? `${picked.label} overview` : 'Overview') : 'Full circuit'}
          </button>
        </div>

        <ol className="space-y-1.5">
          {shown.map((i) => {
            const l = legs[i];
            const on = selected === i;
            const hv = !on && hovered === i;
            const via = l.via?.map((c) => airports[c].city).join(', ');
            const tint = !on && !hv && l.hue ? { color: l.hue } : undefined;
            return (
              <li key={l.n}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered((h) => (h === i ? null : h))}
                  className={`group w-full rounded-xl border px-3 py-2.5 text-left transition sm:px-4 ${
                    on
                      ? 'border-[#ff00ff]/70 bg-[#ff00ff]/[0.07] shadow-[0_0_24px_rgba(255,0,255,0.12)]'
                      : hv
                        ? 'border-white/70 bg-white/[0.06] shadow-[0_0_20px_rgba(255,255,255,0.10)]'
                        : 'border-vitae-green/20 bg-white/[0.025]'
                  }`}
                  style={!on && !hv && l.hue ? { borderColor: `${l.hue}55` } : undefined}
                >
                  <span className="flex items-baseline gap-3">
                    <span style={tint} className={`w-5 text-xs tabular-nums ${on ? 'text-[#ff00ff]' : hv ? 'text-white' : 'text-vitae-green/70'}`}>{l.n}</span>
                    <span className="text-base font-semibold tracking-[0.12em] text-white sm:text-lg">
                      {l.from}
                      <span style={tint} className={`mx-2 ${on ? 'text-[#ff00ff]' : hv ? 'text-white' : 'text-vitae-green'}`}>→</span>
                      {l.toLabel ?? l.to}
                    </span>
                    <span className="ml-auto hidden text-xs tabular-nums tracking-wider text-white/45 sm:inline">
                      {legMiles(airports, l).toLocaleString('en-US')} mi
                    </span>
                    <span style={tint} className="ml-auto w-14 text-right text-base font-semibold tabular-nums text-vitae-green sm:ml-0">
                      ${l.farePP}
                    </span>
                  </span>
                  <span className="mt-0.5 block pl-8 text-sm font-light text-white/55">
                    {airports[l.from].city} → {airports[l.to].city}
                    {via ? ` · via ${via}` : ''} · {l.time}
                  </span>
                  {on && (
                    <span className="mt-2 block border-t border-[#ff00ff]/25 pl-8 pt-2 text-sm font-light leading-relaxed text-white/80">
                      <span className={`block text-white/50 ${hud}`}>{l.carriers}</span>
                      <span className={`mt-1.5 block ${l.flag === 'visa' ? 'text-[#ffff00]' : ''}`}>{l.note}</span>
                      {l.via && (
                        <span className={`mt-1.5 block text-white/40 ${hud}`}>Routing {waypoints(l).join(' → ')}</span>
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <p className={`mt-3 flex items-baseline justify-between px-1 text-white/55 ${hud}`}>
          <span>Per person, one-way{travelers > 1 ? ` · ×${travelers} travelers` : ''}</span>
        </p>
      </div>
    </div>
    </div>
  );
}
