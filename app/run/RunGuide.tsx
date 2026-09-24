'use client';

import { useEffect, useState } from 'react';
import RunMap from './RunMap';
import Elevation from './Elevation';
import { routes, pois, paces, formatDuration, type RunRoute } from './routes';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="bg-black px-3 py-5 text-center">
      <dd className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{value}</dd>
      <dt className={`${label} mt-2`}>{unit}</dt>
    </div>
  );
}

export default function RunGuide() {
  const [selected, setSelected] = useState(routes[0].slug);
  const [pace, setPace] = useState(paces[4].min);

  // Deep links: /run#ten
  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (routes.some((r) => r.slug === fromHash)) setSelected(fromHash);
  }, []);
  const select = (slug: string) => {
    setSelected(slug);
    window.history.replaceState(null, '', `#${slug}`);
  };

  const route: RunRoute = routes.find((r) => r.slug === selected) ?? routes[0];
  const shownMiles = route.officialMiles ?? route.miles;

  return (
    <>
      {/* Route picker */}
      <nav aria-label="Routes" className="pb-2">
        {/* auto-rows-fr keeps every cell the same height even though some names wrap to
            two lines; the name block reserves both lines so single-line cards match. */}
        <ul className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {routes.map((r) => {
            const on = r.slug === selected;
            return (
              <li key={r.slug} className="h-full">
                <button
                  onClick={() => select(r.slug)}
                  aria-pressed={on}
                  className={`flex h-full w-full flex-col items-start justify-between rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
                    on
                      ? 'border-white/60 bg-white/[0.06]'
                      : 'border-white/15 bg-black/40 hover:border-white/40'
                  }`}
                  style={
                    on ? { boxShadow: `0 0 24px ${r.color}33`, borderColor: r.color } : undefined
                  }
                >
                  <span className="flex min-h-[2.5rem] items-start gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }}
                    />
                    <span className="text-sm font-semibold leading-5 text-white">{r.name}</span>
                  </span>
                  <span className="mt-2 text-xs tabular-nums text-white/60">
                    {(r.officialMiles ?? r.miles).toFixed(1)} mi · +{r.ascentFt} ft
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Map */}
      <section aria-label="Map" className="mt-4">
        <RunMap routes={routes} pois={pois} selected={selected} onSelect={select} />
      </section>

      {/* Selected route */}
      <article className={`${glass} mt-6 p-6 sm:p-10`} key={route.slug}>
        <header className="text-center">
          <p className={label} style={{ color: route.color }}>
            {route.kicker}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">
            {route.name}
          </h2>
          <p className="mt-2 text-lg font-light italic text-white/60">{route.tagline}</p>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vitae-green/25 bg-vitae-green/20 sm:grid-cols-4">
          <Stat
            value={shownMiles.toFixed(1)}
            unit={route.officialMiles ? 'miles, official' : 'miles'}
          />
          <Stat value={`+${route.ascentFt}`} unit="ft of climbing" />
          <Stat
            value={formatDuration(shownMiles * pace)}
            unit={`at ${paces.find((p) => p.min === pace)?.label}`}
          />
          <div className="flex flex-col items-center justify-center bg-black px-3 py-4">
            <label htmlFor="pace" className={label}>
              Your pace
            </label>
            <select
              id="pace"
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="mt-2 rounded-lg border border-white/20 bg-black px-3 py-1.5 text-sm text-white focus:border-vitae-green focus:outline-none"
            >
              {paces.map((p) => (
                <option key={p.min} value={p.min}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </dl>

        <p className="mx-auto mt-6 max-w-3xl text-center font-light leading-relaxed text-white/75">
          {route.summary}
        </p>

        <div className="mt-8">
          <h3 className={`${label} mb-3`}>Elevation</h3>
          <Elevation profile={route.profile} color={route.color} miles={route.miles} />
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className={`${label} mb-3 border-b border-vitae-green/20 pb-2`}>Turn by turn</h3>
            <ol className="space-y-3">
              {route.cues.map((c) => (
                <li key={`${c.mi}-${c.text.slice(0, 12)}`} className="flex gap-3">
                  <span
                    className="w-10 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums"
                    style={{ color: route.color }}
                  >
                    {c.mi.toFixed(1)}
                  </span>
                  <span className="text-sm leading-relaxed text-white/80">{c.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-8">
            {route.plan && (
              <div>
                <h3 className={`${label} mb-3 border-b border-vitae-green/20 pb-2`}>The plan</h3>
                <ol className="space-y-4">
                  {route.plan.map((s) => (
                    <li key={s.title}>
                      <p className="font-medium text-white">{s.title}</p>
                      <p className="mt-1 text-sm font-light leading-relaxed text-white/65">
                        {s.body}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {route.facts && (
              <div>
                <h3 className={`${label} mb-3 border-b border-vitae-green/20 pb-2`}>Notes</h3>
                <dl className="space-y-4">
                  {route.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="font-medium text-white">{f.label}</dt>
                      <dd className="mt-1 text-sm font-light leading-relaxed text-white/65">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div>
              <h3 className={`${label} mb-3 border-b border-vitae-green/20 pb-2`}>
                Marathon overlap
              </h3>
              <p className="text-sm font-light leading-relaxed text-white/65">
                {route.marathonMiles}.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-vitae-green/20 pt-6">
          <a
            href={route.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-vitae-green px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
          >
            Open in Google Maps
          </a>
          <a
            href={route.gpx}
            download
            className="rounded-full border border-white/30 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white hover:text-white"
          >
            Download GPX
          </a>
        </div>
      </article>
    </>
  );
}
