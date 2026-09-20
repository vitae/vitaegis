import type { Metadata } from 'next';
import Link from 'next/link';
import RadarConsole from './_radar/RadarConsole';
import { legMiles } from './_radar/geo';
import { DALLAS_BLUE, airports, home, legend, legs, sectors, worldOverview } from './sectors';
import './_radar/radar.css';

export const metadata: Metadata = {
  title: 'Flight Radar | VITAEGIS Travel',
  description:
    'A radar scope of common flight paths out of Honolulu through Asia, South America, Alaska, Dallas, Switzerland and Reykjavik, ranked by distance. Pick a sector, watch the tracks, read the strips.',
  openGraph: {
    title: 'Flight Radar | VITAEGIS Travel',
    description: 'Six sectors out of Honolulu, ranked nearest to farthest. Pick a sector to light its routes.',
    type: 'website',
  },
};

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function TravelRadarPage() {
  const totalMiles = legs.reduce((sum, l) => sum + legMiles(airports, l), 0);
  const stats = [
    { value: String(sectors.length), unit: 'sectors' },
    { value: String(legs.length), unit: 'tracks' },
    { value: String(Object.keys(airports).length), unit: 'airports' },
    { value: totalMiles.toLocaleString('en-US'), unit: 'route miles' },
  ];

  return (
    // The site's global CSS pins <html> to the viewport, so this page scrolls inside its own container.
    <main
      className="fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif", WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="travel-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="pb-10 pt-12 text-center sm:pt-16">
          <p className={label}>Travel · Flight radar · HNL origin · Six sectors</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Flight
            <br />
            Radar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Every track starts in Honolulu. Common flight paths through Asia, South America, Alaska,
            Dallas, Switzerland and Reykjavik, ranked nearest to farthest. Pick a sector to light its
            tracks, then pick a strip to lock onto a flight.{' '}
            <span style={{ color: DALLAS_BLUE }}>Blue tracks route through Dallas.</span>
          </p>
        </header>

        <section aria-label="Flight radar" className={`${glass} p-4 sm:p-8`}>
          <RadarConsole
            airports={airports}
            legs={legs}
            home={home}
            overview={worldOverview}
            sector="All sectors"
            scope="Scope 00"
            regions={sectors}
            legend={legend}
          />
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vitae-green/25 bg-vitae-green/20 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.unit} className="bg-black px-4 py-6 text-center">
              <dd className="text-3xl font-semibold tabular-nums text-white sm:text-4xl">{s.value}</dd>
              <dt className={`${label} mt-2`}>{s.unit}</dt>
            </div>
          ))}
        </dl>

        <section className="mt-12">
          <header className="text-center">
            <p className={label}>Ranked · Nearest to farthest from HNL</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">Six sectors</h2>
            <p className="mx-auto mt-2 max-w-2xl text-lg font-light italic text-white/60">
              Direct great-circle miles to each sector’s closest destination. Strips inside each sector run shortest-first by miles actually flown.
            </p>
          </header>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => {
            const tracks = legs.filter((l) => l.region === s.key);
            const codes = Array.from(new Set(tracks.flatMap((l) => [...(l.via ?? []), l.to])));
            const nearest = tracks[0];
            return (
              <li key={s.key} className={`${glass} p-6`}>
                <div className="flex items-baseline justify-between" style={s.color ? { color: s.color } : undefined}>
                  <p className={label} style={s.color ? { color: s.color } : undefined}>#{s.rank} · {s.sector}</p>
                  <p className="text-sm tabular-nums text-vitae-green" style={s.color ? { color: s.color } : undefined}>{s.miles.toLocaleString('en-US')} mi</p>
                </div>
                <h3 className="mt-1 text-2xl font-semibold tracking-wide text-white">{s.label}</h3>
                <p className="mt-1 text-sm font-light text-white/55">
                  Shortest track: HNL → {nearest.to}{nearest.via ? ` via ${nearest.via.join(', ')}` : ''} · {legMiles(airports, nearest).toLocaleString('en-US')} mi flown
                </p>
                <p className="mt-2 font-light leading-relaxed text-white/70">{s.blurb}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">HNL · {codes.join(' · ')}</p>
                {s.key === 'asia' && (
                  <Link href="/travel/asia" className={`${label} mt-4 inline-block hover:text-white`}>
                    Full Pacific Circuit guide →
                  </Link>
                )}
              </li>
            );
          })}
          </ol>
        </section>

        <footer className="mt-16 text-center text-sm font-light text-white/40">
          <p className="mx-auto max-w-3xl">
            Every track originates at Honolulu. Tracks are typical scheduled routings, not live traffic. Fares are indicative lowest one-way
            economy prices seen on fare aggregators in September 2026 — a planning budget, not a quote.
            Entry notes are for US passports. Compiled by Vitaegis.
          </p>
          <Link href="/" className={`${label} mt-4 inline-block hover:text-white`}>
            Health • Stealth • Wealth
          </Link>
        </footer>
      </div>
    </main>
  );
}
