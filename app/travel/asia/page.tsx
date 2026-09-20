import type { Metadata } from 'next';
import Link from 'next/link';
import RadarConsole from '../_radar/RadarConsole';
import {
  airports, legs, loopTotal, monthLetters, overview, paperwork, rejected, seasons, stops, tactics, tigers, totalMiles, travelers,
} from './data';
import { ASIA_RED, travelPages } from '../sectors';
import '../_radar/radar.css';

export const metadata: Metadata = {
  title: 'The Pacific Circuit | VITAEGIS Travel',
  description:
    'Honolulu to Japan, China, Thailand, Vietnam, Bali and South Korea and home again — eight one-way flights for about $1,060 a person, tracked on a live radar scope, with entry rules, seasons and a field guide to every stop.',
  openGraph: {
    title: 'The Pacific Circuit | VITAEGIS Travel',
    description: 'Six countries, eight flights, one loop out of Honolulu — routed for the lowest fare.',
    type: 'article',
  },
};

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="text-center">
      <p className={label}>{kicker}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mx-auto mt-2 max-w-2xl text-lg font-light italic text-white/60">{sub}</p>}
    </header>
  );
}

const seasonCell = ['bg-white/[0.04]', 'bg-vitae-green/25', 'bg-vitae-green shadow-[0_0_10px_rgba(0,255,0,0.5)]'];

export default function TravelPage() {
  const stats = [
    { value: '6', unit: 'countries' },
    { value: String(legs.length), unit: 'flights' },
    { value: totalMiles.toLocaleString('en-US'), unit: 'miles flown' },
    { value: usd(loopTotal), unit: `flights, ${travelers} travelers` },
  ];

  return (
    // Like /happy-hour: the site's global CSS pins <html> to the viewport and blocks document
    // scrolling in some browsers, so this page scrolls inside its own full-viewport container.
    <main
      className="fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif", WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="travel-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className={`${label} hover:text-white`}>
            ← Vitaegis
          </Link>
          <Link href="/travel" className={`${label} hover:text-white`}>
            ← All sectors
          </Link>
        </nav>

        {/* Hero */}
        <header className="pb-10 pt-12 text-center sm:pt-16">
          <p className={label} style={{ color: ASIA_RED }}>
            Travel · Asia sector · Flight routing guide · HNL origin · September 2026
          </p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] sm:text-7xl"
            style={{ color: ASIA_RED, textShadow: `0 0 24px ${ASIA_RED}` }}
          >
            The Pacific
            <br />
            Circuit
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Honolulu to Japan, China, Thailand, Vietnam, Bali and South Korea, and home again. Eight
            one-way tickets, booked separately, for about {usd(loopTotal / travelers)} a person.
          </p>
        </header>

        {/* Radar console */}
        <section aria-label="Route radar" className={`${glass} p-4 sm:p-8`}>
          <RadarConsole
            airports={airports}
            legs={legs}
            rejected={rejected}
            home="HNL"
            overview={overview}
            travelers={travelers}
            sector="Pacific sector"
            scope="Scope 01"
          />
        </section>

        {/* Stats */}
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vitae-green/25 bg-vitae-green/20 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.unit} className="bg-black px-4 py-6 text-center">
              <dd className="text-3xl font-semibold tabular-nums text-white sm:text-4xl">{s.value}</dd>
              <dt className={`${label} mt-2`}>{s.unit}</dt>
            </div>
          ))}
        </dl>

        {/* Contents */}
        <nav aria-label="Contents" className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            ['#insight', 'Why via Seoul'],
            ['#stops', 'The seven stops'],
            ['#seasons', 'When to go'],
            ['#paperwork', 'Paperwork'],
            ['#tigers', 'Tiger side quest'],
            ['#tactics', 'Booking tactics'],
          ].map(([href, text]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/70 transition hover:border-vitae-green hover:text-vitae-green"
            >
              {text}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-12">
          {/* Insight */}
          <section id="insight" className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
            <SectionHead
              kicker="Routing insight · The red line on the scope"
              title="Why the return goes through Seoul"
            />
            <div className="mt-8 grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <p className="font-light leading-relaxed text-white/75">
                Bali straight back to Honolulu is a thin market — no nonstop, few carriers, little
                competition, and the fare shows it. Break the same crossing at Seoul and it lands on two
                fought-over routes instead: several Asian carriers compete for Bali–Seoul, and
                Seoul–Honolulu is an established daily nonstop. The detour is the cheaper way to make the
                same crossing, and it adds a sixth country.
              </p>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-center">
                <div className="bg-black p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff0000]">Direct-ish</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-white/40 line-through decoration-[#ff0000]/70">
                    {usd(rejected.farePP)}
                  </p>
                  <p className="mt-1 text-xs font-light text-white/50">DPS → HNL, per person</p>
                </div>
                <div className="bg-black p-5">
                  <p className={label}>Via Seoul</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-vitae-green">{usd(rejected.viaSeoulPP)}</p>
                  <p className="mt-1 text-xs font-light text-white/50">DPS → ICN → HNL, per person</p>
                </div>
              </div>
            </div>
          </section>

          {/* Stops */}
          <section id="stops" className="scroll-mt-10">
            <SectionHead
              kicker="Field guide"
              title="The seven stops"
              sub="Thirty-two suggested nights. How to get in, get to town, and what not to miss."
            />
            <div className="mt-8 space-y-6">
              {stops.map((stop, i) => (
                <article key={stop.slug} id={stop.slug} className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
                  <header className="flex flex-col gap-2 border-b border-vitae-green/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className={label}>
                        Stop {String(i + 1).padStart(2, '0')} · {stop.code} · {stop.country}
                      </p>
                      <h3 className="mt-1 text-3xl font-semibold tracking-wide text-white">{stop.city}</h3>
                      <p className="mt-1 font-light italic text-white/60">{stop.tagline}</p>
                    </div>
                    <div className="flex gap-6 sm:text-right">
                      <div>
                        <p className={label}>Stay</p>
                        <p className="mt-1 whitespace-nowrap text-white/85">{stop.nights}</p>
                      </div>
                      <div>
                        <p className={label}>Per day, two</p>
                        <p className="mt-1 whitespace-nowrap tabular-nums text-white/85">{stop.dailyForTwo}</p>
                      </div>
                    </div>
                  </header>

                  <div className="mt-6 grid gap-8 md:grid-cols-2">
                    <dl className="space-y-5">
                      {[
                        ['Entry', stop.entry],
                        ['Airport → city', stop.transfer],
                        ['Money', stop.money],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className={label}>{k}</dt>
                          <dd className="mt-1 font-light leading-relaxed text-white/80">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="space-y-5">
                      <div>
                        <p className={label}>Do this</p>
                        <ul className="mt-2 space-y-2">
                          {stop.doThis.map((item) => (
                            <li key={item} className="flex gap-3 font-light leading-relaxed text-white/80">
                              <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 flex-none rounded-full bg-vitae-green shadow-[0_0_6px_#00ff00]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className={label}>Eat this</p>
                        <p className="mt-1 font-light leading-relaxed text-white/80">{stop.eatThis}</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 border-t border-vitae-green/20 pt-5 text-sm font-light leading-relaxed text-white/65">
                    <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#ffff00]">Watch out</span>
                    {stop.watchOut}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-center text-sm font-light italic text-white/50">
              Daily budgets are mid-range estimates for two people sharing a room — lodging, food, local
              transport and entry fees, flights excluded.
            </p>
          </section>

          {/* Seasons */}
          <section id="seasons" className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
            <SectionHead
              kicker="Weather window"
              title="When to go"
              sub="No month is perfect everywhere. Late October through November comes closest."
            />
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr>
                    <th className="w-24" />
                    {monthLetters.map((m, i) => (
                      <th key={i} className={`text-center text-xs font-medium ${i === 9 || i === 10 ? 'text-vitae-green' : 'text-white/45'}`}>
                        {m}
                      </th>
                    ))}
                    <th className="hidden w-[36%] lg:table-cell" />
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="pr-3 text-sm font-medium text-white/85">{row.label}</th>
                      {row.months.map((level, i) => (
                        <td key={i} className="px-[2px]">
                          <div
                            className={`h-6 rounded-[4px] ${seasonCell[level]}`}
                            title={`${row.label}, ${monthLetters[i]}: ${['avoid', 'workable', 'prime'][level]}`}
                          />
                        </td>
                      ))}
                      <td className="hidden pl-4 text-sm font-light text-white/55 lg:table-cell">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-white/55">
              {['Avoid', 'Workable', 'Prime'].map((name, level) => (
                <span key={name} className="flex items-center gap-2">
                  <i className={`h-3 w-5 rounded-[3px] ${seasonCell[level]}`} /> {name}
                </span>
              ))}
            </div>
          </section>

          {/* Paperwork */}
          <section id="paperwork" className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
            <SectionHead
              kicker="US passports · Checked September 2026"
              title="Paperwork"
              sub="Four of six countries want something filed before you board."
            />
            <ul className="mt-8 divide-y divide-white/10 border-y border-vitae-green/20">
              {paperwork.map((row) => (
                <li key={row.country} className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[1fr_1.4fr_0.9fr_2fr] sm:items-baseline">
                  <p className="font-semibold">{row.country}</p>
                  <p className="text-white/85">{row.status}</p>
                  <p className="tabular-nums text-vitae-green">{row.cost}</p>
                  <p className="text-sm font-light text-white/65">
                    {row.ahead && (
                      <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffff00]">Before you fly</span>
                    )}
                    {row.file}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm font-light italic text-white/55">
              About $135 in fees for two. Passports need six months of validity past each entry date and
              a couple of blank pages. Rules change — Thailand’s did this month — so reconfirm each on the
              country’s official immigration site before booking.
            </p>
          </section>

          {/* Tigers */}
          <section id="tigers" className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
            <SectionHead
              kicker="Thailand side quest"
              title="Tiger encounters"
              sub="Three enclosure operators, priced per person by the size of the cat."
            />
            <ul className="mt-8 divide-y divide-white/10 border-y border-vitae-green/20">
              {tigers.map((t) => (
                <li key={t.name} className="grid gap-3 py-5 md:grid-cols-[1.3fr_2fr_1fr]">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm font-light text-white/55">{t.where}</p>
                  </div>
                  <p className="font-light text-white/80">{t.desc}</p>
                  <div className="md:text-right">
                    <p className="tabular-nums text-vitae-green">{t.price}</p>
                    <p className="text-sm font-light text-white/55">{t.rating}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm font-light italic text-white/55">
              Captive-tiger contact venues draw steady criticism from wildlife-welfare groups over
              breeding, training and housing. Worth weighing next to the price and the reviews. Prices
              and ratings as listed by each venue’s booking pages — reconfirm before you go.
            </p>
          </section>

          {/* Tactics */}
          <section id="tactics" className={`${glass} scroll-mt-10 p-6 sm:p-10`}>
            <SectionHead kicker="Running it" title="Booking tactics" />
            <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {tactics.map((t, i) => (
                <div key={t.head} className="grid grid-cols-[2rem_1fr] gap-x-2">
                  <span className="pt-0.5 text-sm font-semibold tabular-nums text-vitae-green">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-lg font-medium text-white">{t.head}</h3>
                    <p className="mt-1.5 font-light leading-relaxed text-white/65">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <nav aria-label="Other sectors" className="mt-12">
          <p className={`${label} text-center`}>Other scopes</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {travelPages
              .filter((p) => p.slug !== 'asia')
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
            Built for two travelers leaving from and returning to Honolulu. Fares are indicative lowest
            one-way economy prices seen on fare aggregators in September 2026 — a planning budget, not a
            quote. Entry rules are for US passports. Compiled by Vitaegis.
          </p>
          <Link href="/" className={`${label} mt-4 inline-block hover:text-white`}>
            Health • Stealth • Wealth
          </Link>
        </footer>
      </div>
    </main>
  );
}
