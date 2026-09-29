import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Erections, Libido & Testosterone | VITAEGIS VITALITY',
  description:
    'What the evidence says about Pycnogenol, arginine, citrulline, and herbs for male sexual health, and what works better than any of them.',
  openGraph: {
    title: 'Erections, Libido & Testosterone | VITAEGIS VITALITY',
    description: 'Pycnogenol, arginine, citrulline, and herbs: what the evidence actually says.',
    type: 'article',
  },
};

const stack: { name: string; dose: string; role: string }[] = [
  { name: 'Pycnogenol', dose: '50 mg twice daily', role: 'Blood flow: raises nitric oxide production' },
  { name: 'L-citrulline', dose: '2 g', role: 'Blood flow: longer-lasting supply of arginine' },
  { name: 'L-arginine', dose: '2 g', role: 'Blood flow: the form used in the Pycnogenol trials' },
  { name: 'Korean red ginseng', dose: '1–3 g', role: 'Erections and energy. Morning. 4–8 weeks on, 1–2 off' },
  { name: 'Wisconsin ginseng', dose: 'Tea, as desired', role: 'Gentler energy. Off days from Korean red ginseng' },
  { name: 'Beets', dose: '1 cup juice or 2 beets', role: 'Food: nitrate the body turns into nitric oxide' },
  { name: 'Watermelon', dose: 'About 2 cups', role: 'Food: a little natural citrulline' },
  { name: 'Maca root', dose: '1.5–3 g', role: 'Libido' },
  { name: 'Tongkat ali', dose: '200–400 mg', role: 'Testosterone. 5 days on, 2 off' },
  { name: 'Ashwagandha KSM-66', dose: '600 mg', role: 'Testosterone, stress, and sleep. Take in the evening' },
];

const schedule: { slot: string; items: string }[] = [
  { slot: 'Morning', items: 'Pycnogenol 50 mg, Korean red ginseng, maca, tongkat ali. With breakfast.' },
  { slot: 'Before activity', items: 'Citrulline 2 g and arginine 2 g, 60 minutes before sex or training. Mornings on other days.' },
  { slot: 'Evening', items: 'Pycnogenol 50 mg with dinner. Ashwagandha KSM-66 600 mg.' },
];

const levers = [
  'Get bloodwork and a heart check first',
  'Review your medications',
  'Ask a doctor about a PDE5 inhibitor',
  'Kegels, cardio, and heavy lifting',
  'Sleep 7 to 9 hours and lose waist fat',
  'Cut alcohol and quit nicotine',
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function EdPage() {
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
            Erections, Libido
            <br />& Testosterone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            What the evidence says about Pycnogenol, arginine, citrulline, and the herbs sold for
            male sexual health, and the things that work better than any of them.
          </p>
          <a
            href="/vitaegis-ed-guide.pdf"
            download
            className="mt-8 inline-block rounded-full border border-vitae-green px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
          >
            Download the PDF
          </a>
        </header>

        <section className="border-l-2 border-vitae-green pl-5">
          <h2 className={label}>The short answer</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Pycnogenol, a pine bark extract, probably helps erections when the problem is mild and
            vascular. Nearly all of the evidence pairs it with L-arginine, and it takes 1 to 3 months
            to build up. It does little for libido directly, and no herb matches a prescription ED
            drug.
          </p>
        </section>

        <section className={`${glass} mt-10 p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>The Vitaegis stack</h2>
          <ul className="mt-6 divide-y divide-vitae-green/20">
            {stack.map((s) => (
              <li key={s.name} className="flex flex-col gap-x-4 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-xl font-medium">{s.name}</span>
                <span className={label}>{s.dose}</span>
                <span className="font-light text-white/60 sm:w-1/2 sm:text-right">{s.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-l-2 border-red-600 pl-3 text-sm font-light leading-relaxed text-red-100">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-500">
              Caution
            </span>
            Pycnogenol, citrulline, arginine, beets, and ginseng all lower blood pressure. Never
            combine with nitrates. Arginine and citrulline can trigger cold sores. Talk to a doctor first if you take blood pressure medication,
            ED drugs, blood thinners, diabetes medication, or thyroid medication.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {schedule.map((s) => (
            <div key={s.slot} className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5">
              <p className={label}>{s.slot}</p>
              <p className="mt-2 font-light leading-relaxed text-white/80">{s.items}</p>
            </div>
          ))}
        </section>

        <p className="mt-6 border-l-2 border-vitae-green pl-5 font-light leading-relaxed text-white/70">
          The ED trials used Korean red ginseng, so it leads the stack. Wisconsin ginseng is American
          ginseng, a gentler, cooling species. Drink it as tea on off days rather than stacking both
          daily.
        </p>

        <section className="mt-10">
          <h2 className={label}>Bigger levers than any supplement</h2>
          <ol className="mt-4 divide-y divide-vitae-green/20">
            {levers.map((l, i) => (
              <li key={l} className="grid grid-cols-[3rem_1fr] py-3">
                <span className="text-2xl font-light leading-none text-vitae-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-light text-white/85">{l}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 font-light text-white/60">
            Full herb tables, doses, and study citations are in the PDF.
          </p>
        </section>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          Education only, not medical advice. These statements have not been evaluated by the FDA.
          ED can be an early sign of heart disease or diabetes, so see a doctor before starting any
          supplement, especially with prescription medication.
        </p>
      </div>
    </main>
  );
}
