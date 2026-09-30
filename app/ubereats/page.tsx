import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Uber Eats on a Onewheel | VITAEGIS WEALTH',
  description:
    'The GLITCH playbook: how to earn the most on Uber Eats in Waikiki riding a Onewheel. Acceptance rules, Uber Eats Pro tiers, Quests, Boost, and the order log that decides everything.',
  openGraph: {
    title: 'Uber Eats on a Onewheel | VITAEGIS WEALTH',
    description:
      'Acceptance rules, Uber Eats Pro tiers, Quests, Boost, and the order log that decides everything.',
    type: 'article',
  },
};

/* Uber Eats brand green, used only for the Uber-specific accents on this page. */
const UE = '#06C167';

const tiers: { tier: string; perk: string }[] = [
  { tier: 'Green', perk: 'Base. Discounts only.' },
  { tier: 'Gold', perk: 'Preferred Deliveries: priority on higher-paying trips.' },
  { tier: 'Platinum', perk: 'Preferred Deliveries plus premium perks.' },
  { tier: 'Diamond', perk: 'Everything above plus Premium Support.' },
];

const acceptRule = [
  {
    k: 'Take it',
    v: 'Pay ÷ realistic minutes is $0.50/min or better. Add ~5 min for any hotel or condo tower.',
  },
  {
    k: 'Take it',
    v: 'Same-restaurant stacks. Two orders from one pickup is nearly free money on a board.',
  },
  { k: 'Decline', v: 'Anything leaving the Waikiki zone with no return order.' },
  {
    k: 'Decline',
    v: 'Huge orders, drink-heavy orders, anything that will not fit the insulated pack.',
  },
  { k: 'Decline', v: 'Mid-route add-ons going to a different tower.' },
  {
    k: 'Never',
    v: 'Accept to protect the rate and then cancel. Cancellations hurt far more than declines.',
  },
];

const levers: { title: string; body: string }[] = [
  {
    title: 'Quests',
    body: 'Weekly targets that pay a lump bonus. Waikiki trips are short, so trip-count Quests fall faster on a board than in a car. On tiered Quests, aim one tier above where you would land naturally.',
  },
  {
    title: 'Boost',
    body: 'A fare multiplier inside a mapped zone and time window. Waikiki lights up at dinner and late night. Stay inside the zone and let the multiplier stack on short hops instead of taking an order that drags you to Kaimuki.',
  },
  {
    title: 'Wait-time pay',
    body: 'Uber pays wait fees after one minute at the restaurant. Tap Arrived the moment you reach the door and stay put while the clock runs.',
  },
  {
    title: 'Tip protection',
    body: 'Uber covers tips a customer cuts after delivery, so the upfront number is real. Use it as-is when you do the math.',
  },
  {
    title: 'Community Map',
    body: 'Add entrance and lobby-handoff notes for every tower you deliver to. It lifts your on-time rate, which feeds your tier.',
  },
  {
    title: 'Lobby handoff',
    body: 'Text the customer at pickup and ask them to meet you in the lobby. Saves five to eight minutes per tower and pushes more orders into each Boost window.',
  },
  {
    title: 'Points Pass',
    body: 'Protects your Pro status while you take a break. Use it for AGLOHA week or travel so you do not fall back to Green.',
  },
  {
    title: 'Rain',
    body: 'Boost spikes in rain. Water is the enemy of the board and painted lines get slick. Decide your rain rule in advance, not in the moment.',
  },
];

const windows: { slot: string; note: string }[] = [
  { slot: '6–9 AM', note: 'Breakfast. Jet-lagged mainland visitors are up early.' },
  { slot: '11 AM–1:30 PM', note: 'Lunch.' },
  { slot: '2–5 PM', note: 'Dead zone. Charge the board.' },
  { slot: '5–9 PM', note: 'Dinner. Prime Boost window.' },
  { slot: '9 PM–2 AM', note: 'Late night. Second Boost window.' },
];

const logFields = [
  'App',
  'Offer $ and final $',
  'Tip',
  'Accept → pickup (min)',
  'Wait at restaurant (min)',
  'Pickup → drop (min)',
  'Restaurant',
  'Building',
  'Stacked?',
  'Weather',
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function UberEatsPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-16 text-center">
          <p className={label}>Vitaegis Wealth · GLITCH</p>
          <h1
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-6xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Uber Eats
            <br />
            on a Onewheel
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            How to earn the most delivering in Waikiki on a board. Cars lose time to one-way streets
            and parking. You do not.
          </p>
          <span
            className="mt-8 inline-block rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-black"
            style={{ backgroundColor: UE }}
          >
            Uber Eats · Waikiki
          </span>
        </header>

        <section className="border-l-2 border-vitae-green pl-5">
          <h2 className={label}>The short answer</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Accept by rule, not by mood. Uber Eats pays for status, and status is mostly acceptance
            rate. For a car, high acceptance means eating long unprofitable trips. In bike mode
            inside Waikiki nearly every offer is a short hop, so keeping acceptance high costs
            almost nothing. The board makes the status game cheap.
          </p>
        </section>

        <section className={`${glass} mt-10 p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>The acceptance rule</h2>
          <ul className="mt-6 divide-y divide-vitae-green/20">
            {acceptRule.map((r, i) => (
              <li key={i} className="grid grid-cols-[6rem_1fr] gap-x-4 py-4">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{
                    color: r.k === 'Take it' ? UE : r.k === 'Never' ? '#ff0000' : '#ffffff99',
                  }}
                >
                  {r.k}
                </span>
                <span className="font-light text-white/80">{r.v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-light leading-relaxed text-white/60">
            Uber shows upfront pay with the expected tip, plus distance and time, before you accept.
            This rule should land around 80–90% acceptance, which is usually enough for Gold. Your
            exact Honolulu threshold is in the app under Uber Pro. Acceptance is a rolling figure,
            so a few declines wash out.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={label}>Uber Eats Pro tiers</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {tiers.map((t, i) => (
              <div
                key={t.tier}
                className="rounded-xl border p-4"
                style={{
                  borderColor: i >= 1 ? `${UE}66` : 'rgba(255,255,255,0.15)',
                  backgroundColor: i >= 1 ? `${UE}0f` : 'transparent',
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: i >= 1 ? UE : '#ffffff80' }}
                >
                  {t.tier}
                </p>
                <p className="mt-2 text-sm font-light leading-relaxed text-white/80">{t.perk}</p>
              </div>
            ))}
          </div>
          <p
            className="mt-4 border-l-2 pl-5 font-light leading-relaxed text-white/70"
            style={{ borderColor: UE }}
          >
            Tier is based on acceptance rate, on-time rate, cancellation rate, satisfaction rating
            and monthly points. Nobody outside Uber knows how much Preferred Deliveries is worth in
            Honolulu. Run two weeks at Green with the rule above, hit Gold, run two more weeks, and
            compare dollars per active minute. If Gold moves the number, protect it. If not,
            cherry-pick harder.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={label}>Levers</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {levers.map((l) => (
              <div
                key={l.title}
                className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5"
              >
                <p className={label}>{l.title}</p>
                <p className="mt-2 font-light leading-relaxed text-white/80">{l.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${glass} mt-10 p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>Time blocks</h2>
          <ul className="mt-6 divide-y divide-vitae-green/20">
            {windows.map((w) => (
              <li
                key={w.slot}
                className="flex flex-col gap-x-4 py-4 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="text-xl font-medium">{w.slot}</span>
                <span className="font-light text-white/60 sm:w-2/3 sm:text-right">{w.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className={label}>Log every order</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            The tracker turns all of this from theory into a decision each shift. The metric is
            dollars per active minute, broken down by restaurant, building, hour and tier. Within a
            month you have a data-backed blocklist of slow kitchens, slow towers and mall-interior
            pickups.
          </p>
          <ol className="mt-4 divide-y divide-vitae-green/20">
            {logFields.map((f, i) => (
              <li key={f} className="grid grid-cols-[3rem_1fr] py-3">
                <span className="text-2xl font-light leading-none text-vitae-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-light text-white/85">{f}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 border-l-2 border-red-600 pl-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-500">
            Know the law
          </h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-red-100/80">
            Honolulu ordinance §15-4.6 bans skateboards and similar devices from roadways except
            when crossing, and from Waikiki sidewalks and roadways entirely. It predates electric
            boards and never names them. Fine is $25. Ride accordingly and know the exposure. Not
            legal advice.
          </p>
        </section>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          Uber Eats is a trademark of Uber Technologies, Inc. Vitaegis is not affiliated with Uber.
          Platform rules change; confirm current terms in the Uber Driver app.
        </p>
      </div>
    </main>
  );
}
