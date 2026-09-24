import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RadarConsole from '../_radar/RadarConsole';
import { legMiles, waypoints } from '../_radar/geo';
import { airports, findTravelPage, home, legend, legs, travelPages, travelSlugs } from '../sectors';
import '../_radar/radar.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return travelSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = findTravelPage((await params).slug);
  if (!page) return {};
  const title = `${page.title} | VITAEGIS Travel`;
  return {
    title,
    description: `${page.blurb} Every track starts in Honolulu, on a live radar scope.`,
    openGraph: { title, description: page.blurb, type: 'website' },
  };
}

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default async function TravelSectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = findTravelPage((await params).slug);
  if (!page) notFound();

  const tracks = legs.filter(page.match);
  const totalMiles = tracks.reduce((sum, l) => sum + legMiles(airports, l), 0);
  const nonstops = tracks.filter((l) => !l.via?.length).length;
  const lowest = Math.min(...tracks.map((l) => l.farePP));
  const accent = page.color ? { color: page.color } : undefined;
  const scopeNo = String(travelPages.findIndex((p) => p.slug === page.slug) + 1).padStart(2, '0');

  const stats = [
    { value: String(tracks.length), unit: tracks.length === 1 ? 'track' : 'tracks' },
    { value: String(nonstops), unit: nonstops === 1 ? 'nonstop' : 'nonstops' },
    { value: totalMiles.toLocaleString('en-US'), unit: 'route miles' },
    { value: `$${lowest}`, unit: 'lowest fare' },
  ];

  return (
    // The site's global CSS pins <html> to the viewport, so this page scrolls inside its own container.
    <main
      className="nav-clear fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth bg-black text-left text-white"
      style={{
        fontFamily: "'Jost', sans-serif",
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <div
        className="travel-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className={`${label} hover:text-white`}>
            ← Vitaegis
          </Link>
          <Link href="/travel" className={`${label} hover:text-white`}>
            ← All sectors
          </Link>
        </nav>

        <header className="pb-10 pt-12 text-center sm:pt-16">
          <p className={label} style={accent}>
            Travel · Flight radar · HNL origin · {page.sector}
          </p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] sm:text-7xl"
            style={{
              color: page.color ?? '#00ff00',
              textShadow: `0 0 24px ${page.color ?? 'rgba(0,255,0,0.45)'}`,
            }}
          >
            {page.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">{page.blurb}</p>
        </header>

        <section aria-label={`${page.title} radar`} className={`${glass} p-4 sm:p-8`}>
          <RadarConsole
            airports={airports}
            legs={tracks}
            home={home}
            overview={page.overview}
            sector={page.sector}
            scope={`Scope ${scopeNo}`}
            legend={legend.filter((g) => tracks.some((l) => l.hue === g.color))}
          />
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vitae-green/25 bg-vitae-green/20 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.unit} className="bg-black px-4 py-6 text-center">
              <dd className="text-3xl font-semibold tabular-nums text-white sm:text-4xl">
                {s.value}
              </dd>
              <dt className={`${label} mt-2`}>{s.unit}</dt>
            </div>
          ))}
        </dl>

        {/* Tracks in detail */}
        <section className="mt-12">
          <header className="text-center">
            <p className={label} style={accent}>
              In detail · Nonstops first, then shortest flown
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">
              {tracks.length === 1 ? 'The track' : `The ${tracks.length} tracks`}
            </h2>
          </header>
          <ol className="mt-8 space-y-4">
            {tracks.map((l) => {
              const chain = waypoints(l);
              const tint = l.hue ? { color: l.hue } : undefined;
              return (
                <li
                  key={l.n}
                  className={`${glass} p-6 sm:p-8`}
                  style={l.hue ? { borderColor: `${l.hue}55` } : undefined}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={label} style={tint}>
                        Track {l.n} · VTG{l.n} ·{' '}
                        {l.via?.length
                          ? `${l.via.length} ${l.via.length === 1 ? 'stop' : 'stops'}`
                          : 'Nonstop'}
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-[0.08em] text-white">
                        {chain.map((code, i) => (
                          <span key={code}>
                            {i > 0 && (
                              <span className="mx-2 text-vitae-green" style={tint}>
                                →
                              </span>
                            )}
                            {i === chain.length - 1 && l.toLabel ? l.toLabel : code}
                          </span>
                        ))}
                      </h3>
                      <p className="mt-1 font-light text-white/60">
                        {chain.map((c) => airports[c].city).join(' → ')}
                      </p>
                    </div>
                    <div className="flex gap-6 sm:text-right">
                      <div>
                        <p className={label}>Fare</p>
                        <p
                          className="mt-1 text-2xl font-semibold tabular-nums text-vitae-green"
                          style={tint}
                        >
                          ${l.farePP}
                        </p>
                      </div>
                      <div>
                        <p className={label}>Flown</p>
                        <p className="mt-1 whitespace-nowrap text-2xl font-semibold tabular-nums text-white/85">
                          {legMiles(airports, l).toLocaleString('en-US')} mi
                        </p>
                      </div>
                    </div>
                  </div>
                  <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-3">
                    <div>
                      <dt className={label}>Time</dt>
                      <dd className="mt-1 font-light text-white/80">{l.time}</dd>
                    </div>
                    <div>
                      <dt className={label}>Carriers</dt>
                      <dd className="mt-1 font-light text-white/80">{l.carriers}</dd>
                    </div>
                    <div>
                      <dt className={label}>Legs</dt>
                      <dd className="mt-1 font-light text-white/80">
                        {chain.slice(1).map((code, i) => (
                          <span key={code} className="block tabular-nums">
                            {chain[i]} → {code} ·{' '}
                            {Math.round(legMilesBetween(chain[i], code) / 10) * 10} mi
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                  <p
                    className={`mt-5 font-light leading-relaxed ${l.flag === 'visa' ? 'text-[#ffff00]' : 'text-white/75'}`}
                  >
                    {l.flag === 'visa' && (
                      <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.25em]">
                        Paperwork
                      </span>
                    )}
                    {l.note}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Other sectors */}
        <nav aria-label="Other sectors" className="mt-12">
          <p className={`${label} text-center`}>Other scopes</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {travelPages
              .filter((p) => p.slug !== page.slug)
              .map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/travel/${p.slug}`}
                    className="inline-block rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/70 transition hover:border-vitae-green hover:text-vitae-green"
                    style={p.color ? { borderColor: `${p.color}66`, color: p.color } : undefined}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <footer className="mt-16 text-center text-sm font-light text-white/40">
          <p className="mx-auto max-w-3xl">
            Every track originates at Honolulu on Alaska Airlines, Hawaiian, American or a oneworld
            / Mileage Plan partner. Tracks are typical scheduled routings, not live traffic. Fares
            are indicative lowest one-way economy prices seen on fare aggregators in September 2026
            — a planning budget, not a quote. Entry notes are for US passports. Compiled by
            Vitaegis.
          </p>
          <Link href="/" className={`${label} mt-4 inline-block hover:text-white`}>
            Health • Stealth • Wealth
          </Link>
        </footer>
      </div>
    </main>
  );
}

function legMilesBetween(a: string, b: string) {
  return legMiles(airports, { n: '', from: a, to: b, farePP: 0, time: '', carriers: '', note: '' });
}
