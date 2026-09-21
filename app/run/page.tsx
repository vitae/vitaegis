import type { Metadata } from 'next';
import Link from 'next/link';
import RunGuide from './RunGuide';
import LiveStrava from './LiveStrava';
import RunLog from './RunLog';
import { routes } from './routes';
import './run.css';

export const metadata: Metadata = {
  title: 'Run · Diamond Head | VITAEGIS',
  description:
    'Running routes from the Gold Coast: a 4.1-mile lighthouse errand run to Planet Fitness and Whole Foods with the bus home, a 7-mile lighthouse, Kahala and Kaimuki loop, a 10-mile Waikiki–Magic Island–Diamond Head loop, the official Honolulu Marathon course, the KCC Saturday market loop and a flat park shakeout. Maps, elevation, turn-by-turn and GPX.',
  openGraph: {
    title: 'Run · Diamond Head | VITAEGIS',
    description: 'Six running routes out of the Gold Coast, mapped and measured, with the marathon course for December.',
    type: 'article',
  },
};

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

const week = [
  ['Mon', 'Park Shakeout', 'easy, strides on the grass'],
  ['Wed', 'Kahala Errand', 'run, lift, lunch, bus'],
  ['Thu', 'Lighthouse Seven', 'hills at steady effort'],
  ['Sat', 'Saturday Market Loop', 'crater loop with breakfast at KCC'],
  ['Sun', 'The Ten', 'long run, before sunrise'],
];

export default function RunPage() {
  const totalMiles = routes.reduce((s, r) => s + (r.officialMiles ?? r.miles), 0);
  return (
    // Like /travel: the site's global CSS pins <html> to the viewport in some browsers, so this
    // page scrolls inside its own full-viewport container.
    <main
      className="fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif", WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="run-grid pointer-events-none absolute inset-x-0 top-0 h-[700px]" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="pb-8 pt-12 text-center sm:pt-16">
          <p className={label}>Run · Gold Coast · Diamond Head, Honolulu</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Gold Coast
            <br />
            Runs
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Six routes out the front door: the lighthouse errand run to Planet Fitness and Whole Foods with TheBus
            home, a seven-mile loop past the lighthouse and back over Kaimuki, a ten-mile south-shore loop,
            the official Honolulu Marathon course, the Saturday market loop over Diamond Head, and a flat
            park shakeout. {Math.round(totalMiles)} miles in all, mapped
            and measured.
          </p>
        </header>

        <RunGuide />

        <LiveStrava />

        <RunLog />

        {/* How they fit */}
        <section className={`${glass} mt-12 p-6 sm:p-10`}>
          <header className="text-center">
            <p className={label}>A week that uses all of them</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">How they fit together</h2>
          </header>
          <ul className="mx-auto mt-8 max-w-2xl divide-y divide-vitae-green/15">
            {week.map(([day, name, note]) => (
              <li key={day} className="flex items-baseline gap-4 py-3">
                <span className="w-12 shrink-0 text-sm font-semibold uppercase tracking-[0.2em] text-vitae-green">{day}</span>
                <span className="font-medium text-white">{name}</span>
                <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/20" />
                <span className="text-right text-sm font-light text-white/60">{note}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm font-light leading-relaxed text-white/60">
            Together they rehearse most of the marathon: Kalakaua and Monsarrat, both climbs of Diamond
            Head Road, Kilauea Avenue and the finish along the park. Only the Kalanianaole out-and-back to
            Hawaii Kai is missing, and Route 23 from Kahala Mall gets you there.
          </p>
        </section>

        {/* Field notes */}
        <section className={`${glass} mt-6 p-6 sm:p-10`}>
          <header className="text-center">
            <p className={label}>Field notes</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">Before you go</h2>
          </header>
          <dl className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ['Heat', 'Sunrise is around 6:30 in September and 7:00 by December. Start early; Diamond Head Road has no shade or water after KCC.'],
              ['Traffic', 'Diamond Head Road is a narrow two-lane with a good sidewalk on the ocean side. On Kalanianaole run the shoulder facing traffic, or save it for race day.'],
              ['TheBus', 'Adult fare $3 with a HOLO card or exact cash. Route 14 is the only line that stops at the door (Kalakaua Ave + Elks Club); Route 2 is the frequent one, from Kapahulu Ave a mile away.'],
            ].map(([t, b]) => (
              <div key={t}>
                <dt className={label}>{t}</dt>
                <dd className="mt-2 text-sm font-light leading-relaxed text-white/70">{b}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 border-t border-vitae-green/20 pt-5 text-center text-xs font-light leading-relaxed text-white/45">
            Routes traced on OpenStreetMap data (© OpenStreetMap contributors, ODbL) with pedestrian routing;
            distances are measured along the trace and rounded, elevation is from terrain data. Marathon course
            per honolulumarathon.org; the traced line is a close approximation of the certified course. Business
            hours and bus times as published September 2026, confirm before you rely on them.
          </p>
        </section>
      </div>
    </main>
  );
}
