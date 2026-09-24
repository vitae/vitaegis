import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Daily Stack | VITAEGIS VITALITY',
  description:
    'The Vitaegis Vitality daily stack: seven supplements, what each one is for, and when to take it.',
  openGraph: {
    title: 'Daily Stack | VITAEGIS VITALITY',
    description: 'Seven supplements, what each one is for, and when to take it.',
    type: 'article',
  },
};

type Item = {
  n: string;
  name: string;
  product: string;
  dose: string;
  why: string;
  when: string;
  note?: string;
};

const schedule: { slot: string; hint: string; items: string[] }[] = [
  {
    slot: 'Morning',
    hint: 'With a breakfast that has fat',
    items: ['Omega-3', 'Vitamin D3 5000 IU', 'K2 MK-7 90 mcg', 'B-Right', 'Ubiquinol + PQQ'],
  },
  { slot: 'Any time', hint: 'Same time each day helps', items: ['Creatine 5 g'] },
  {
    slot: 'Evening',
    hint: 'One to two hours before bed',
    items: ['Magnesium Threonate 144 mg'],
  },
];

const rules: { title: string; body: string }[] = [
  {
    title: 'Fat with fat',
    body: 'Omega-3, D3, K2, and ubiquinol are fat soluble. Take them with the meal, never on an empty stomach.',
  },
  {
    title: 'Consistency wins',
    body: 'Creatine and magnesium work by saturation. Daily for weeks beats perfect timing for days.',
  },
  {
    title: 'Test, do not guess',
    body: 'A 25-OH vitamin D blood test once or twice a year confirms whether 5000 IU is the right dose.',
  },
  {
    title: 'Keep it lean',
    body: 'Review the stack every six months. Anything without a clear reason to stay gets cut.',
  },
];

const stack: Item[] = [
  {
    n: '01',
    name: 'Omega-3 fish oil',
    product: 'Nordic Naturals Ultimate Omega',
    dose: 'Per label serving',
    why: 'EPA and DHA for heart health, triglycerides, brain function, and recovery from training.',
    when: 'With a meal that contains fat. Absorption drops sharply on an empty stomach.',
  },
  {
    n: '02',
    name: 'Vitamin D3',
    product: '5000 IU (125 mcg)',
    dose: 'Daily',
    why: 'Bone strength, immune function, muscle performance, and healthy testosterone signaling.',
    when: 'With the same fat-containing meal as the omega-3. Pair with K2.',
    note: '5000 IU sits above the 4000 IU daily upper limit NIH sets for adults, so a 25-OH vitamin D blood test once or twice a year is the way to confirm the dose fits.',
  },
  {
    n: '03',
    name: 'Vitamin K2',
    product: 'Jarrow MK-7, 90 mcg',
    dose: 'Daily, with D3',
    why: 'Activates the proteins that move calcium into bone and keep it out of arteries. The natural partner to a higher D3 dose.',
    when: 'Same meal as D3. Fat soluble.',
    note: 'K2 interferes with warfarin and similar blood thinners.',
  },
  {
    n: '04',
    name: 'Magnesium Threonate',
    product: '144 mg elemental magnesium',
    dose: 'Daily',
    why: 'The form of magnesium studied for crossing into the brain: sleep quality, focus, and calm.',
    when: 'Evening, one to two hours before bed.',
    note: '144 mg of elemental magnesium is a modest dose. It is a brain and sleep supplement more than a way to hit total magnesium intake, which food (greens, nuts, beans) still has to cover.',
  },
  {
    n: '05',
    name: 'Creatine monohydrate',
    product: '5 g',
    dose: 'Daily, every day',
    why: 'The most proven strength supplement there is: more power and volume on heavy lifts, more lean mass over time, with growing evidence for cognition.',
    when: 'Any time of day. Consistency matters, timing does not. Drink plenty of water.',
  },
  {
    n: '06',
    name: 'B-complex',
    product: 'Jarrow B-Right',
    dose: 'Per label serving',
    why: 'Methylated B vitamins for energy metabolism, nervous system function, and homocysteine control.',
    when: 'Morning, with food. Bright yellow urine afterward is excess riboflavin and is harmless.',
  },
  {
    n: '07',
    name: 'Ubiquinol + PQQ',
    product: 'Jarrow QH-Absorb 100 mg + PQQ 10 mg',
    dose: 'Daily',
    why: 'Ubiquinol is the active form of CoQ10 and feeds mitochondrial energy production. PQQ supports the growth of new mitochondria.',
    when: 'Morning, with a fat-containing meal.',
    note: 'Kept as insurance. Evidence is strongest for people on statins and for older adults, so for a healthy adult under 40 this one is optional.',
  },
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function VitaminsPage() {
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
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Daily
            <br />
            Stack
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Seven supplements, what each one is for, and when to take it.
          </p>
          <a
            href="/vitaegis-daily-stack.pdf"
            download
            className="mt-8 inline-block rounded-full border border-vitae-green px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
          >
            Download the PDF
          </a>
        </header>

        <section className={`${glass} p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>Daily schedule</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {schedule.map((s) => (
              <div
                key={s.slot}
                className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5"
              >
                <p className={label}>{s.slot}</p>
                <p className="mt-1 text-sm font-light text-white/50">{s.hint}</p>
                <ul className="mt-4 divide-y divide-white/10">
                  {s.items.map((i) => (
                    <li key={i} className="py-2 font-medium">
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border-l-2 border-vitae-green pl-5">
          <h2 className={label}>Food base</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Steak, chicken, eggs, cheese, and milk, with plenty of fruits and vegetables. That plate
            already delivers protein, zinc, B12, iron, and calcium, which is why the stack stays
            short and targets what food covers least: omega-3, vitamin D, K2, and magnesium.
          </p>
        </section>

        <section className="mt-10">
          <h2 className={label}>Ground rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {rules.map((r) => (
              <div
                key={r.title}
                className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5"
              >
                <p className={label}>{r.title}</p>
                <p className="mt-2 font-light leading-relaxed text-white/80">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${glass} mt-10 p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>The stack, item by item</h2>
          <ol className="mt-6 divide-y divide-vitae-green/20">
            {stack.map((item) => (
              <li key={item.n} className="grid grid-cols-[3rem_1fr] gap-x-3 py-7">
                <span className="text-3xl font-light leading-none text-vitae-green">{item.n}</span>
                <div>
                  <div className="flex flex-col gap-x-4 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="text-xl font-medium">{item.name}</h3>
                    <span className={label}>{item.dose}</span>
                  </div>
                  <p className="mt-1 text-white/50">{item.product}</p>
                  <dl className="mt-4 space-y-2">
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className={`${label} pt-1`}>Why</dt>
                      <dd className="font-light leading-relaxed text-white/85">{item.why}</dd>
                    </div>
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className={`${label} pt-1`}>When</dt>
                      <dd className="font-light leading-relaxed text-white/85">{item.when}</dd>
                    </div>
                  </dl>
                  {item.note && (
                    <p className="mt-4 border-l-2 border-red-600 pl-3 text-sm font-light leading-relaxed text-red-100">
                      <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-500">
                        Note
                      </span>
                      {item.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          Personal reference, not medical advice. Doses reflect one regimen. Check with a doctor or
          pharmacist before copying it, especially with any prescription medication, a kidney
          condition, or blood thinners.
        </p>
      </div>
    </main>
  );
}
