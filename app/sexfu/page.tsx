import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sex Fu: Taoist Techniques for Her Pleasure | VITAEGIS VITALITY',
  description:
    "A summary of Mantak Chia's Taoist approach to a woman's orgasm: slow warm-up, connection, rhythm, lasting longer, and moving sexual energy through the body.",
  openGraph: {
    title: 'Sex Fu | VITAEGIS VITALITY',
    description: "Mantak Chia's Taoist techniques for her pleasure, summarized.",
    type: 'article',
  },
};

const techniques: { name: string; text: string }[] = [
  {
    name: 'Long warm-up',
    text: 'Spend much more time on kissing, touch and closeness before intercourse. Chia treats this as the main event, not a preliminary.',
  },
  {
    name: 'Whole-body touch',
    text: 'Touch everywhere, not just the genitals, since he sees the whole body as connected by energy channels. He includes massage of the hands, feet and ears, which Taoist reflexology links to the organs.',
  },
  {
    name: 'Emotional connection',
    text: "Chia calls the heart the start of a woman's arousal. Eye contact, affection and feeling safe matter as much as technique.",
  },
  {
    name: 'Clear communication',
    text: "Ask what she likes and let her guide your hands, speed and pressure. He stresses that every woman's body is different.",
  },
  {
    name: 'Direct clitoral stimulation',
    text: 'He treats it as central, along with the G-spot, and encourages using hands and mouth, not just intercourse.',
  },
  {
    name: 'Vary depth and rhythm',
    text: 'The classic Taoist pattern is "nine shallow, one deep." Shallow strokes stimulate the most sensitive outer area, and varying the pattern keeps arousal building.',
  },
  {
    name: 'Last longer',
    text: "The man's ejaculation control, from The Multi-Orgasmic Man, is what gives her the time she needs. The tools are breathing, PC squeezes and pausing near the edge.",
  },
  {
    name: 'Stay near the peak',
    text: 'Instead of rushing to a single climax, he teaches riding the high point of arousal, which he says opens the way to multiple and longer orgasms.',
  },
  {
    name: 'Breathe together and spread the energy',
    text: 'Partners match their breathing, then draw sexual energy up the spine (the "orgasmic upward draw"). He says this turns a genital orgasm into a whole-body one.',
  },
];

const herPractice = [
  'Pelvic floor exercises, which are also well supported by modern research for stronger orgasms.',
  'Breast massage, and exploring her own body so she knows what works for her.',
  'Breathing and circulating energy through the body.',
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function SexFuPage() {
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
            Sex Fu
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Mantak Chia&apos;s Taoist approach to her pleasure. Men are fire: quick to light, quick to
            burn out. Women are water: slow to heat, and hot for longer. So slow down and let it build.
          </p>
        </header>

        <section className={`${glass} p-6 sm:p-10`}>
          <h2 className={`${label} text-center`}>The techniques</h2>
          <ol className="mt-6 divide-y divide-vitae-green/20">
            {techniques.map((t, i) => (
              <li key={t.name} className="grid grid-cols-[3rem_1fr] gap-y-1 py-5">
                <span className="text-2xl font-light leading-none text-vitae-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-xl font-medium">{t.name}</p>
                  <p className="mt-1 font-light leading-relaxed text-white/70">{t.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className={label}>Her own practice</h2>
          <p className="mt-2 font-light text-white/50">From The Multi-Orgasmic Woman</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {herPractice.map((p) => (
              <li key={p} className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5 font-light leading-relaxed text-white/80">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 border-l-2 border-vitae-green pl-5 font-light leading-relaxed text-white/70">
          Go deeper with Mantak Chia&apos;s books: The Multi-Orgasmic Man, The Multi-Orgasmic Couple
          and The Multi-Orgasmic Woman.
        </p>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          A Vitaegis summary of Mantak Chia&apos;s teachings, for education only. Not affiliated with
          or endorsed by Mantak Chia or his publishers. Not medical advice.
        </p>
      </div>
    </main>
  );
}
