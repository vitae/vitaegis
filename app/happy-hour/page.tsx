import type { Metadata } from 'next';
import Link from 'next/link';
import { spots, lateNight, lateNightLeftOut, steakForTwo, type Spot, type MenuGroup } from './data';

export const metadata: Metadata = {
  title: 'Happy Hour Hawaiʻi | VITAEGIS',
  description:
    'The finest food-first happy hours of Honolulu & Waikiki, ranked — every menu, price, hour, exact address and parking note, plus late-night sessions and steak for two.',
  openGraph: {
    title: 'Happy Hour Hawaiʻi | VITAEGIS',
    description:
      'The finest food-first happy hours of Honolulu & Waikiki, ranked, with every plate, pour and address.',
    type: 'article',
  },
};

const mapsUrl = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const telUrl = (phone: string) => `tel:+1${phone.replace(/\D/g, '')}`;
const fullAddress = (s: Spot) => s.addressLines.join(', ');
const hoursOf = (s: Spot) => s.facts[0]?.value.split('\n').join(' · ') ?? '';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

function Group({ group }: { group: MenuGroup }) {
  return (
    <div className="mb-8 break-inside-avoid-column">
      <h4 className={`${label} mb-3 border-b border-vitae-green/20 pb-2`}>{group.heading}</h4>
      <ul className="space-y-2.5">
        {group.items.map((item) => (
          <li key={item.name}>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-white">{item.name}</span>
              <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/20" />
              <span className="whitespace-nowrap tabular-nums">
                {item.was && <s className="mr-2 text-sm text-white/40">{item.was}</s>}
                {item.price && <span className="font-semibold text-vitae-green">{item.price}</span>}
              </span>
            </div>
            {item.desc && <p className="text-sm font-light text-white/55">{item.desc}</p>}
          </li>
        ))}
      </ul>
      {group.notes?.map((note) => (
        <p key={note} className="mt-3 text-sm font-light leading-relaxed text-white/60">
          {note}
        </p>
      ))}
    </div>
  );
}

function SpotSection({ spot }: { spot: Spot }) {
  const address = fullAddress(spot);
  return (
    <section id={spot.slug} className={`${glass} scroll-mt-24 p-6 sm:p-10`}>
      <header className="text-center">
        <p className={label}>
          {spot.rank ? `No. ${spot.rank} · ` : 'Beyond Happy Hour · '}
          {spot.area}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">{spot.name}</h2>
        <p className="mt-2 text-lg font-light italic text-white/60">{spot.tagline}</p>
      </header>

      <dl className="mt-8 grid gap-6 border-y border-vitae-green/20 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {spot.facts.slice(0, 2).map((fact) => (
          <div key={fact.label}>
            <dt className={label}>{fact.label}</dt>
            <dd className="mt-1 whitespace-pre-line text-white/85">{fact.value}</dd>
          </div>
        ))}
        <div>
          <dt className={label}>Address</dt>
          <dd className="mt-1 text-white/85">
            <a
              href={mapsUrl(`${spot.name}, ${address}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-pre-line underline decoration-vitae-green/40 underline-offset-4 hover:text-vitae-green"
            >
              {spot.addressLines.join('\n')}
            </a>
            <a href={telUrl(spot.phone)} className="mt-1 block hover:text-vitae-green">
              {spot.phone}
            </a>
          </dd>
        </div>
        {spot.facts.slice(2).map((fact) => (
          <div key={fact.label}>
            <dt className={label}>{fact.label}</dt>
            <dd className="mt-1 whitespace-pre-line text-white/85">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mx-auto mt-6 max-w-3xl text-center font-light italic leading-relaxed text-white/70">
        {spot.why}
      </p>

      <div className="mt-8 gap-10 md:columns-2">
        {spot.groups.map((group) => (
          <Group key={group.heading} group={group} />
        ))}
      </div>

      <p className="border-t border-vitae-green/20 pt-5 text-center text-sm font-light italic text-white/55">
        {spot.note}
      </p>
    </section>
  );
}

export default function HappyHourPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        {/* Hero */}
        <header className="py-16 text-center">
          <p className={label}>A Curated Guide · Honolulu · September 2026</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Happy Hour
            <br />
            Hawaiʻi
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            The finest food-first happy hours of Honolulu &amp; Waikiki, ranked, with every plate,
            pour and address.
          </p>
          <a
            href="/happy-hour-hawaii.pdf"
            download
            className="mt-8 inline-block rounded-full border border-vitae-green px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
          >
            Download the PDF guide
          </a>
        </header>

        {/* Contents */}
        <nav aria-label="Contents" className={`${glass} p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>Contents</h2>
          <ol className="mt-6 divide-y divide-white/10">
            {spots.map((spot) => (
              <li key={spot.slug} className="py-4">
                <div className="grid grid-cols-[2.5rem_1fr] gap-x-2">
                  <span className="font-semibold text-vitae-green">{spot.rank || '✦'}</span>
                  <div>
                    <a href={`#${spot.slug}`} className="group flex flex-col gap-x-3 sm:flex-row sm:items-baseline">
                      <span className="text-lg font-medium group-hover:text-vitae-green">{spot.name}</span>
                      <span className="text-sm uppercase tracking-wider text-white/60 sm:ml-auto sm:text-right">
                        {hoursOf(spot)}
                      </span>
                    </a>
                    <p className="mt-1 text-sm font-light text-white/55">
                      <a
                        href={mapsUrl(`${spot.name}, ${fullAddress(spot)}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-vitae-green"
                      >
                        {fullAddress(spot)}
                      </a>
                      {' · '}
                      <a href={telUrl(spot.phone)} className="hover:text-vitae-green">
                        {spot.phone}
                      </a>
                    </p>
                  </div>
                </div>
              </li>
            ))}
            <li className="py-4">
              <a href="#late-night" className="group flex items-baseline gap-x-3">
                <span className="w-10 font-semibold text-vitae-green">✦</span>
                <span className="text-lg font-medium group-hover:text-vitae-green">Late Night, Food First</span>
                <span className="ml-auto text-sm uppercase tracking-wider text-white/60">After 9 PM</span>
              </a>
            </li>
            <li className="py-4">
              <a href="#steak-for-two" className="group flex items-baseline gap-x-3">
                <span className="w-10 font-semibold text-vitae-green">✦</span>
                <span className="text-lg font-medium group-hover:text-vitae-green">
                  Tomahawk &amp; Steak for Two
                </span>
                <span className="ml-auto text-sm uppercase tracking-wider text-white/60">The steakhouses</span>
              </a>
            </li>
          </ol>
          <p className="mt-6 text-center text-sm font-light italic text-white/50">
            Ranked by the strength of the food offer. Prices as published on each restaurant&apos;s own
            site, September 2026. Hawaiʻi tax of 4.712% is added everywhere; gratuity is additional.
          </p>
        </nav>

        {/* Spots */}
        <div className="mt-12 space-y-12">
          {spots.map((spot) => (
            <SpotSection key={spot.slug} spot={spot} />
          ))}

          {/* Late night */}
          <section id="late-night" className={`${glass} scroll-mt-24 p-6 sm:p-10`}>
            <header className="text-center">
              <p className={label}>After Nine · Honolulu &amp; Waikiki</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-wide sm:text-4xl">Late Night, Food First</h2>
              <p className="mt-2 text-lg font-light italic text-white/60">
                The second sessions where the kitchen, not the bar, is the point.
              </p>
            </header>
            <ul className="mt-8 divide-y divide-white/10 border-y border-vitae-green/20">
              {lateNight.map((row) => (
                <li key={row.name} className="grid gap-3 py-5 md:grid-cols-[1.2fr_1fr_2fr]">
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <a
                      href={mapsUrl(`${row.name}, ${row.address}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-light text-white/55 hover:text-vitae-green"
                    >
                      {row.address}
                    </a>
                    <a href={telUrl(row.phone)} className="text-sm font-light text-white/55 hover:text-vitae-green">
                      {row.phone}
                    </a>
                  </div>
                  <p className="text-vitae-green">{row.window}</p>
                  <p className="font-light text-white/80">{row.order}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm font-light italic text-white/55">{lateNightLeftOut}</p>
          </section>

          {/* Steak for two */}
          <section id="steak-for-two" className={`${glass} scroll-mt-24 p-6 sm:p-10`}>
            <header className="text-center">
              <p className={label}>Beyond Happy Hour · The Steakhouses</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-wide sm:text-4xl">
                Tomahawk &amp; Steak for Two
              </h2>
              <p className="mt-2 text-lg font-light italic text-white/60">
                Every for-two package on an official menu in town, cheapest first.
              </p>
            </header>
            <ul className="mt-8 divide-y divide-white/10 border-y border-vitae-green/20">
              {steakForTwo.map((row) => (
                <li key={row.name} className="grid gap-3 py-5 md:grid-cols-[1.2fr_2fr_1.2fr]">
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <a
                      href={mapsUrl(`${row.name}, ${row.address}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-light text-white/55 hover:text-vitae-green"
                    >
                      {row.address}
                    </a>
                    <a href={telUrl(row.phone)} className="text-sm font-light text-white/55 hover:text-vitae-green">
                      {row.phone}
                    </a>
                  </div>
                  <p className="font-light text-white/85">{row.cut}</p>
                  <p className="text-sm font-light italic text-white/55">{row.consider}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm font-light italic text-white/55">
              Roy&apos;s and Solera carry no tomahawk or for-two. d.k Steak House and BLT Steak have closed.
              Tax and gratuity are additional throughout.
            </p>
          </section>
        </div>

        <footer className="mt-16 text-center text-sm font-light text-white/40">
          <p>
            Hours and prices change — call ahead before you go. Compiled by Vitaegis from each
            restaurant&apos;s official site.
          </p>
          <Link href="/" className={`${label} mt-4 inline-block hover:text-white`}>
            Health • Stealth • Wealth
          </Link>
        </footer>
      </div>
    </main>
  );
}
