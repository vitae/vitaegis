import type { Metadata } from 'next';
import Link from 'next/link';

const title = 'Tipper | VITAEGIS';
const description = 'Tipper setlists in running order.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/tipper' },
  openGraph: { title, description, type: 'website' },
};

type Setlist = { name: string; tracks: string[] };

const SETLISTS: Setlist[] = [
  {
    name: 'RRX25DOWN',
    tracks: [
      'Goldilocks Zone',
      'Gulch VIP',
      'Vection VIP',
      'Exit Chapel Perilous',
      'Rare & Plentiful VIP',
      'Relish the Trough',
      'Whomi VIP',
      'Permatemp VIP',
      'Kites Couldn’t Even',
      'Lorenzo Senni – Canone Infinito (Tipper Remix) VIP?',
      'Preparations For Departure',
      'Ever Decreasing Circles',
      'Mason VIP',
      'Meadow Foam?',
      'Scaffolder',
      'Wookstock',
      'Uptrick VIP',
      'SinBanshee VIP',
      'Pono',
      'Sorus',
      'Magpies?',
      'Little Peeks',
      'Minimal Thoughts of Reason',
      'Neuron Huskie',
    ],
  },
];

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function TipperPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/music" className={`${label} hover:text-white`}>
          Music
        </Link>

        <header className="py-16 text-center">
          <p className={label}>Vitaegis Music</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.18em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Tipper
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Setlists in running order.
          </p>
        </header>

        {SETLISTS.map((set) => (
          <section
            key={set.name}
            id={set.name.toLowerCase()}
            className="rounded-2xl border border-[#00ff00]/30 p-5 sm:p-8"
          >
            <p className={label}>Setlist · {set.tracks.length} tracks</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[0.08em]">{set.name}</h2>
            <ol className="mt-6 divide-y divide-white/10">
              {set.tracks.map((track, i) => (
                <li key={`${i}-${track}`} className="flex gap-4 py-2.5">
                  <span className="w-7 shrink-0 text-right font-mono text-sm leading-7 text-vitae-green/80">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-lg font-light text-white/90">{track}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
