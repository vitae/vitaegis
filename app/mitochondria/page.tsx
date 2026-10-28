import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mitochondria: Maximizing Human Energy | VITAEGIS VITALITY',
  description:
    'How 36 trillion cells make ATP, and every vitamin, supplement, and habit with real evidence for building, fueling, and protecting mitochondria.',
  openGraph: {
    title: 'Mitochondria: Maximizing Human Energy | VITAEGIS VITALITY',
    description:
      'ATP, the electron transport chain, and the full mitochondria supplement list ranked by evidence.',
    type: 'article',
  },
};

type Supp = { name: string; dose: string; role: string; tier: 'A' | 'B' | 'C' };

const tiers: Record<Supp['tier'], string> = {
  A: 'Strong human evidence',
  B: 'Good mechanism, moderate human data',
  C: 'Promising, thin human data',
};

const groups: { title: string; intro: string; items: Supp[] }[] = [
  {
    title: 'Fuel the electron transport chain',
    intro:
      'Direct cofactors. Without these the chain runs short no matter what else you take; deficiency caps ATP output.',
    items: [
      {
        name: 'Ubiquinol (CoQ10)',
        dose: '100–300 mg with fat',
        role: 'Carries electrons from Complex I/II to III. Falls ~50% by age 80; statins deplete it. Q-SYMBIO: 300 mg/day halved cardiac events in heart failure.',
        tier: 'A',
      },
      {
        name: 'Creatine monohydrate',
        dose: '3–5 g daily',
        role: 'Phosphocreatine regenerates ATP in seconds. The best-studied supplement in sports science; also helps cognition under sleep loss.',
        tier: 'A',
      },
      {
        name: 'Magnesium',
        dose: '300–400 mg glycinate',
        role: 'ATP only works as Mg-ATP. Roughly half of adults run low.',
        tier: 'A',
      },
      {
        name: 'B-complex',
        dose: 'B1, B2, B3, B5, B12',
        role: 'B2 becomes FAD, B3 becomes NAD+, B5 becomes coenzyme A. Riboflavin is underrated; benfotiamine is the fat-soluble B1.',
        tier: 'A',
      },
      {
        name: 'NAD+ precursors',
        dose: 'NMN or NR 250–1,000 mg, or niacin',
        role: 'NAD+ is the electron carrier Complex I runs on and what sirtuins need. Declines with age.',
        tier: 'B',
      },
      {
        name: 'Trace minerals',
        dose: 'Iron, copper, zinc, selenium, manganese',
        role: 'Iron-sulfur clusters, Complex IV, superoxide dismutase. Only supplement iron if ferritin says so.',
        tier: 'A',
      },
      {
        name: 'Vitamin K2 (MK-7)',
        dose: '100–200 mcg',
        role: 'Acts as a mitochondrial electron carrier in some models, besides directing calcium.',
        tier: 'C',
      },
      {
        name: 'D-ribose',
        dose: '5 g',
        role: 'The sugar backbone of ATP. Small trials in heart failure and fibromyalgia.',
        tier: 'C',
      },
      {
        name: 'MitoQ / SkQ1',
        dose: '10–20 mg',
        role: 'CoQ10 chemically targeted to accumulate inside mitochondria. Pricier than ubiquinol.',
        tier: 'B',
      },
    ],
  },
  {
    title: 'Build new mitochondria',
    intro:
      'Signals that switch on PGC-1α, AMPK, and the sirtuins, the pathways that drive mitochondrial biogenesis. Exercise does this best; these amplify it.',
    items: [
      {
        name: 'PQQ',
        dose: '10–20 mg',
        role: 'Activates CREB and PGC-1α so the cell builds more mitochondria. Trials show better sleep, less fatigue, sharper attention.',
        tier: 'B',
      },
      {
        name: 'Pterostilbene / resveratrol',
        dose: '50–100 mg / 150–500 mg',
        role: 'SIRT1 and PGC-1α activators. Pterostilbene absorbs far better than resveratrol.',
        tier: 'B',
      },
      {
        name: 'Berberine',
        dose: '500 mg 2–3× with meals',
        role: 'AMPK activator with metformin-like effects on blood sugar, which itself lowers mitochondrial ROS.',
        tier: 'B',
      },
      {
        name: 'Quercetin / fisetin',
        dose: '500 mg / 100 mg',
        role: 'Flavonoids with senolytic effects: they help clear worn-out cells.',
        tier: 'C',
      },
      {
        name: 'Hydroxytyrosol',
        dose: '10–25 mg or olive oil',
        role: 'Olive polyphenol that upregulates PGC-1α.',
        tier: 'C',
      },
      {
        name: 'EGCG (green tea)',
        dose: '300–400 mg or 3 cups',
        role: 'Catechin that supports biogenesis and fat oxidation.',
        tier: 'B',
      },
      {
        name: 'Nitrate (beetroot)',
        dose: '1 cup juice',
        role: 'Lowers the oxygen cost of exercise; more ATP per breath.',
        tier: 'A',
      },
      {
        name: 'Shilajit',
        dose: '250–500 mg',
        role: 'Fulvic acid; one study showed it amplified CoQ10. Weak evidence.',
        tier: 'C',
      },
    ],
  },
  {
    title: 'Clear damaged mitochondria',
    intro:
      'Mitophagy and autophagy. Old, leaky mitochondria produce more ROS and less ATP; clearing them makes room for healthy ones.',
    items: [
      {
        name: 'Urolithin A',
        dose: '500–1,000 mg',
        role: 'Made by gut bacteria from pomegranate ellagitannins; most people make little. Trials show better muscle endurance and mitochondrial gene expression in older adults.',
        tier: 'B',
      },
      {
        name: 'Spermidine',
        dose: '1–6 mg (wheat germ extract)',
        role: 'Autophagy inducer tied to longevity in population studies.',
        tier: 'B',
      },
      {
        name: 'Taurine',
        dose: '1–3 g',
        role: 'Stabilizes mitochondrial tRNA. A 2023 Science paper linked falling taurine to aging and showed health gains in animals. Cheap.',
        tier: 'B',
      },
      {
        name: 'Sulforaphane',
        dose: '20–40 mg (broccoli sprout)',
        role: 'Strongest dietary Nrf2 activator: switches on your own antioxidant enzymes.',
        tier: 'B',
      },
    ],
  },
  {
    title: 'Protect the membranes',
    intro:
      'Mitochondria are the largest source of reactive oxygen species in the body. These defend the inner membrane and rebuild glutathione, the master antioxidant.',
    items: [
      {
        name: 'Alpha lipoic acid (R-ALA)',
        dose: '300–600 mg',
        role: 'Cofactor for pyruvate dehydrogenase, recycles vitamin C, E, and glutathione. Pairs with ALCAR in the classic Ames protocol.',
        tier: 'B',
      },
      {
        name: 'Acetyl L-carnitine (ALCAR)',
        dose: '500–1,500 mg',
        role: 'Shuttles fatty acids into mitochondria for burning. Crosses the blood-brain barrier better than plain carnitine.',
        tier: 'B',
      },
      {
        name: 'L-carnitine tartrate',
        dose: '1–2 g',
        role: 'Same carrier, the form muscle prefers. Take ALCAR for brain, tartrate for training.',
        tier: 'B',
      },
      {
        name: 'Fish oil (EPA + DHA)',
        dose: '1–2 g EPA/DHA',
        role: 'Incorporates into mitochondrial membranes, lowers inflammatory signaling. Strongest in people with metabolic dysfunction or heart disease.',
        tier: 'A',
      },
      {
        name: 'NAC + glycine (GlyNAC)',
        dose: '600–1,200 mg NAC + 1–3 g glycine',
        role: 'Baylor trials in older adults: restored glutathione, improved mitochondrial function, lower oxidative stress. Strong recent data.',
        tier: 'A',
      },
      {
        name: 'Astaxanthin',
        dose: '4–12 mg',
        role: 'Spans the full membrane bilayer. Good for exercise recovery.',
        tier: 'B',
      },
      {
        name: 'Melatonin',
        dose: '0.5–3 mg at night',
        role: 'Mitochondria make their own. A potent mitochondrial antioxidant, not only a sleep hormone.',
        tier: 'B',
      },
      {
        name: 'Curcumin',
        dose: '500 mg phytosome',
        role: 'Nrf2 activation and inflammation. Needs piperine or a phytosome form to absorb.',
        tier: 'B',
      },
      {
        name: 'Berry polyphenols',
        dose: 'A cup a day',
        role: 'Anthocyanins activate Nrf2. Whole food beats megadosed isolated antioxidants, which can blunt the useful ROS signal from exercise.',
        tier: 'A',
      },
    ],
  },
  {
    title: 'Alternative fuel',
    intro:
      'Ketones skip glycolysis and enter the Krebs cycle directly, yielding more ATP per unit of oxygen.',
    items: [
      {
        name: 'MCT oil',
        dose: '1–2 tbsp',
        role: 'Converts to ketones within an hour. Start small or it will send you to the bathroom.',
        tier: 'B',
      },
      {
        name: 'Ketone esters',
        dose: '10–25 g',
        role: 'Instant ketosis without fasting. Expensive and taste terrible; elite endurance data is mixed.',
        tier: 'C',
      },
    ],
  },
  {
    title: 'Adaptogens',
    intro: 'Worth knowing, thinner evidence, mostly subjective fatigue measures.',
    items: [
      { name: 'Cordyceps', dose: '1–3 g', role: 'Modest VO₂max data.', tier: 'C' },
      {
        name: 'Rhodiola',
        dose: '200–400 mg',
        role: 'Fatigue and stress; morning only.',
        tier: 'C',
      },
    ],
  },
];

const foundations = [
  'Zone 2 cardio plus occasional intervals: the single best-proven driver of mitochondrial biogenesis',
  'Sleep 7 to 9 hours: mitochondrial repair runs on the circadian clock',
  'Time-restricted eating: fasting windows trigger mitophagy',
  'Cold plunges and sauna: hormetic stress that builds mitochondrial density',
  'Morning sunlight: sets the clock that governs mitochondrial gene expression',
  'Stable blood sugar: glucose spikes raise mitochondrial ROS',
  'Cut smoking, excess alcohol, overtraining, and chronic stress: cortisol itself impairs mitochondria',
];

const ranked = [
  { name: 'Creatine', why: 'Strongest evidence, cheapest, safest' },
  { name: 'Magnesium + B-complex', why: 'Fix the cofactors before adding anything exotic' },
  { name: 'Fish oil', why: 'Strong for inflammation, moderate for energy' },
  { name: 'Taurine + GlyNAC', why: 'Cheap, new, well-run human trials' },
  { name: 'Ubiquinol', why: 'Especially past 40 or on a statin' },
  { name: 'NAD+ precursor', why: 'Good mechanism, human data still maturing' },
  { name: 'ALA + ALCAR', why: 'The classic pair for aging mitochondria' },
  { name: 'Urolithin A + PQQ', why: 'Clear the old, build the new. The most speculative tier' },
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

function TierBadge({ tier }: { tier: Supp['tier'] }) {
  const styles =
    tier === 'A'
      ? 'border-vitae-green text-vitae-green'
      : tier === 'B'
        ? 'border-vitae-green/50 text-vitae-green/80'
        : 'border-white/30 text-white/50';
  return (
    <span
      title={tiers[tier]}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${styles}`}
    >
      {tier}
    </span>
  );
}

export default function MitochondriaPage() {
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
          <p className={label}>Vitaegis Vitality</p>
          <h1
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-6xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Mitochondria
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            The powerhouse of the cell. How 36 trillion cells make energy, and every supplement and
            habit with real evidence for building, fueling, and protecting the machinery.
          </p>
        </header>

        <section className="border-l-2 border-vitae-green pl-5">
          <h2 className={label}>The short answer</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Every cell spends ATP to do anything at all, and roughly 90% of it comes from
            mitochondria. An adult male runs about 36 trillion cells, a female about 28 trillion,
            each with hundreds to thousands of mitochondria. Usable energy is capped not by how much
            you eat but by how many mitochondria you have, how clean they run, and whether the
            electron transport chain has its cofactors. Exercise and sleep move those numbers more
            than any pill; the supplements below amplify them.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { slot: 'Glycolysis', items: 'Cytoplasm. Glucose splits into pyruvate. Net 2 ATP.' },
            {
              slot: 'Krebs cycle',
              items:
                'Mitochondrial matrix. Pyruvate is fully oxidized into NADH and FADH₂, the electron carriers.',
            },
            {
              slot: 'Oxidative phosphorylation',
              items:
                'Inner membrane. The electron transport chain pumps protons; ATP synthase spins them into ~28 ATP.',
            },
          ].map((s) => (
            <div
              key={s.slot}
              className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5"
            >
              <p className={label}>{s.slot}</p>
              <p className="mt-2 font-light leading-relaxed text-white/80">{s.items}</p>
            </div>
          ))}
        </section>

        <p className="mt-6 border-l-2 border-vitae-green pl-5 font-light leading-relaxed text-white/70">
          One glucose molecule yields 30 to 32 ATP in total, nearly all of it from the mitochondrial
          stage. CoQ10 is the shuttle between Complexes I/II and III. NAD+ and FAD are the carriers.
          Magnesium is bound to every ATP that does work. That is why the cofactor list comes first.
        </p>

        <section className="mt-14">
          <h2 className={`${label} text-center`}>The full list, by mechanism</h2>
          <p className="mt-3 text-center text-sm font-light text-white/50">
            {Object.entries(tiers).map(([t, d]) => (
              <span key={t} className="mx-2 inline-flex items-center gap-1.5">
                <TierBadge tier={t as Supp['tier']} /> {d}
              </span>
            ))}
          </p>
        </section>

        {groups.map((g) => (
          <section key={g.title} className={`${glass} mt-8 p-6 sm:p-10`}>
            <h3 className={label}>{g.title}</h3>
            <p className="mt-2 font-light leading-relaxed text-white/60">{g.intro}</p>
            <ul className="mt-6 divide-y divide-vitae-green/20">
              {g.items.map((s) => (
                <li
                  key={s.name}
                  className="grid gap-x-4 gap-y-1 py-4 sm:grid-cols-[2rem_1fr_1.6fr]"
                >
                  <TierBadge tier={s.tier} />
                  <div>
                    <span className="text-xl font-medium">{s.name}</span>
                    <span className={`${label} block mt-1`}>{s.dose}</span>
                  </div>
                  <span className="font-light leading-relaxed text-white/60 sm:col-start-3">
                    {s.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className={`${glass} mt-8 border-red-600/40 p-6 sm:p-10`}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-500">
            Experimental: read before touching
          </h3>
          <p className="mt-3 font-light leading-relaxed text-red-100/80">
            <span className="font-medium text-white">Low-dose methylene blue</span> works as an
            alternative electron carrier in the transport chain. Real mechanism, real risk: it is an
            MAOI and can cause serotonin syndrome with SSRIs or SNRIs, and the dose window is
            narrow. Not a casual add.
          </p>
        </section>

        <section className="mt-14">
          <h2 className={label}>Where to start, in order</h2>
          <ol className="mt-4 divide-y divide-vitae-green/20">
            {ranked.map((r, i) => (
              <li key={r.name} className="grid grid-cols-[3rem_1fr] py-3">
                <span className="text-2xl font-light leading-none text-vitae-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="font-medium text-white/90">{r.name}</span>
                  <span className="font-light text-white/55"> · {r.why}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className={label}>Bigger levers than any supplement</h2>
          <ol className="mt-4 divide-y divide-vitae-green/20">
            {foundations.map((l, i) => (
              <li key={l} className="grid grid-cols-[3rem_1fr] py-3">
                <span className="text-2xl font-light leading-none text-vitae-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-light text-white/85">{l}</span>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 border-l-2 border-vitae-green pl-5 font-light leading-relaxed text-white/70">
          Related: the{' '}
          <Link href="/vitamins" className="text-vitae-green hover:text-white">
            Daily Stack
          </Link>{' '}
          covers the seven supplements worth taking regardless; this page is the deeper energy layer
          on top of it.
        </p>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          Education only, not medical advice. These statements have not been evaluated by the FDA.
          Statins deplete CoQ10, berberine and ALA lower blood sugar, and fish oil thins blood, so
          talk to a doctor or pharmacist before combining any of these with prescription medication.
        </p>
      </div>
    </main>
  );
}
