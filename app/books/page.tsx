import type { Metadata } from 'next';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import PillarLinks from '@/components/PillarLinks';
import SectionTitle from '@/components/SectionTitle';
import CategoryPosts, { type CategoryPost } from '@/components/CategoryPosts';

export const metadata: Metadata = {
  title: 'The Canon | VITAEGIS BOOKS',
  description:
    'The books behind Vitaegis: Sun Tzu, Musashi, Mantak Chia, Machiavelli, Emerson, Osho, Gibran, Coelho, and Lowry, mapped to Health • Stealth • Wealth.',
  openGraph: {
    title: 'The Canon | VITAEGIS BOOKS',
    description: 'The books behind Vitaegis, mapped to Health • Stealth • Wealth.',
    type: 'article',
  },
};

import { books, type BookPillar as Pillar } from '@/lib/books';

const pillarStyle: Record<Pillar, string> = {
  Health: 'border-vitae-green/60 text-vitae-green',
  Stealth: 'border-white/50 text-white',
  Wealth: 'border-red-500/70 text-red-400',
};

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

const morePosts: CategoryPost[] = [
  {
    href: '/proverbs',
    label: 'Proverbs & Oracle',
    blurb: 'A living archive of Zen, Stoic, Taoist and Kundalini wisdom. Ask the Oracle.',
  },
];

export default function BooksPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6">
        <section className="relative flex flex-col items-center py-10 text-center sm:py-14">
          <SectionTitle
            as="h1"
            tagline={
              <>
                Ten books behind everything we build. Strategy, energy, sovereignty, and purpose,
                mapped to{' '}
                <PillarLinks />.
              </>
            }
          >
            The Canon
          </SectionTitle>

          <div className="flex w-full flex-col gap-8 text-left sm:gap-10">
            {books.map((b) => (
              <GlassContainer key={b.code} variant="default" glow padding="lg" className="w-full">
                <article id={b.code.toLowerCase()} className="grid gap-6 sm:grid-cols-[6rem_1fr]">
                  <div className="flex items-baseline gap-4 sm:flex-col sm:gap-2">
                    <span className="text-3xl font-light text-vitae-green">{b.code}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {b.year}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold leading-tight">{b.title}</h2>
                    <p className="mt-1 font-light text-white/60">{b.author}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {b.pillars.map((p) => (
                        <span
                          key={p}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${pillarStyle[p]}`}
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-white/90">
                      {b.thesis}
                    </p>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                      <div>
                        <h3 className={label}>Core ideas</h3>
                        <ul className="mt-3 space-y-2 font-light text-white/75">
                          {b.ideas.map((i) => (
                            <li key={i} className="border-l border-vitae-green/40 pl-3">
                              {i}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className={label}>The Vitaegis way</h3>
                        <ul className="mt-3 space-y-2 font-light text-white/75">
                          {b.angles.map((a) => (
                            <li key={a} className="border-l border-white/20 pl-3">
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {b.quotes && (
                      <div className="mt-6 space-y-3">
                        {b.quotes.map((q) => (
                          <blockquote
                            key={q.text}
                            className="border-l-2 border-red-600 bg-white/[0.03] px-4 py-3"
                          >
                            <p className="font-light italic text-white/90">
                              &ldquo;{q.text}&rdquo;
                            </p>
                            <cite className="mt-1 block text-[11px] not-italic uppercase tracking-[0.2em] text-white/45">
                              {q.source}
                            </cite>
                          </blockquote>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      {b.pdf && (
                        <a
                          href={b.pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-full border border-[#ff0000] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff0000] transition hover:bg-[#ff0000] hover:text-black"
                        >
                          Read the PDF · Free
                        </a>
                      )}
                      <a
                        href={`https://bookshop.org/search?keywords=${encodeURIComponent(b.search)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-full border border-vitae-green px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
                      >
                        Get the book
                      </a>
                    </div>
                  </div>
                </article>
              </GlassContainer>
            ))}
          </div>

          <CategoryPosts posts={morePosts} title="More in Books" className="mt-8 w-full sm:mt-10" />

          <p className="mt-8 text-center text-sm font-light leading-relaxed text-white/45 sm:mt-10">
            Summaries are original Vitaegis notes. Quotes are from public-domain editions.
          </p>

          <Link href="/" className={`${label} mt-8 hover:text-white sm:mt-10`}>
            ← Vitaegis
          </Link>
        </section>
      </div>
    </main>
  );
}
