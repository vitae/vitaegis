import type { Metadata } from 'next';
import Link from 'next/link';
import CategoryPosts, { type CategoryPost } from '@/components/CategoryPosts';

export const metadata: Metadata = {
  title: 'Music | VITAEGIS',
  description: 'DJ tools and set studies: harmonic mixing, keys, tempos and transitions.',
  openGraph: {
    title: 'Music | VITAEGIS',
    description: 'DJ tools and set studies from Vitaegis.',
    type: 'website',
  },
};

const posts: CategoryPost[] = [
  {
    href: '/keycrate',
    label: 'KeyCrate',
    blurb:
      'Harmonic set builder for a rekordbox library: Camelot wheel, in-key suggestions, exports.',
  },
  {
    href: '/keycrate/study',
    label: 'Set Study',
    blurb:
      'Paste a tracklist and see every transition, the BPM path and the key path on the wheel.',
  },
  {
    href: '/tippersunrisegorge',
    label: 'Tipper · Sunrise at the Gorge',
    blurb: 'Track-by-track study of the 6 July 2025 set: every key, tempo and transition.',
  },
];

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function MusicPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          Vitaegis
        </Link>

        <header className="py-16 text-center">
          <p className={label}>Vitaegis Music</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.18em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Music
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Tools and studies for mixing in key: harmonic set building, and full breakdowns of the
            sets worth learning from.
          </p>
        </header>

        <CategoryPosts posts={posts} className="mt-0" />
      </div>
    </main>
  );
}
