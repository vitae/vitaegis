import type { Metadata } from 'next';
import Link from 'next/link';
import PillarLinks from '@/components/PillarLinks';
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

type Pillar = 'Health' | 'Stealth' | 'Wealth';

type Book = {
  code: string;
  title: string;
  author: string;
  year: string;
  pillars: Pillar[];
  thesis: string;
  ideas: string[];
  angles: string[];
  quotes?: { text: string; source: string }[];
  search: string;
};

const books: Book[] = [
  {
    code: 'AW',
    title: 'The Art of War',
    author: 'Sun Tzu',
    year: 'c. 5th c. BCE',
    pillars: ['Stealth', 'Wealth'],
    thesis:
      'Win before the fight begins. Victory comes from preparation, knowing the terrain, knowing yourself, and choosing battles you have already won.',
    ideas: [
      'Planning decides outcomes more than effort in the moment.',
      'Stay formless: never let opponents read your position.',
      'Speed matters. Long campaigns drain resources.',
      'Adapt like water to the shape of the ground.',
    ],
    angles: [
      'Know yourself: bloodwork and biomarkers as reconnaissance.',
      'Build quietly and reveal nothing until it is done.',
      'Choose your terrain: design your environment for your habits.',
      'Run short campaigns: 30-day protocols over vague lifelong goals.',
    ],
    quotes: [
      { text: 'All warfare is based on deception.', source: 'Lionel Giles translation, 1910' },
      {
        text: 'If you know the enemy and know yourself, you need not fear the result of a hundred battles.',
        source: 'Lionel Giles translation, 1910',
      },
    ],
    search: 'art of war sun tzu',
  },
  {
    code: '5R',
    title: 'The Book of Five Rings',
    author: 'Miyamoto Musashi',
    year: '1645',
    pillars: ['Stealth', 'Health'],
    thesis:
      'Mastery through relentless, practical training. An undefeated swordsman teaches you to strip away ornament, study the way in everything, and act without hesitation.',
    ideas: [
      'Five books: Earth (foundations), Water (adaptability), Fire (combat), Wind (other schools), Void (beyond technique).',
      'Train daily until skill becomes second nature.',
      'Keep a relaxed, alert gaze that sees the whole field.',
      'Learn every art. One discipline sharpens the others.',
    ],
    angles: [
      'The five rings as a five-day training split.',
      'Tai Chi and flow arts as training for the mind as well as the body.',
      'A calm body under pressure: breathwork for fight-or-flight.',
      'Void: meditation as the final ring.',
    ],
    search: 'book of five rings musashi',
  },
  {
    code: 'MO',
    title: 'The Microcosmic Orbit',
    author: 'Mantak Chia · Awaken Healing Energy Through the Tao',
    year: '1983',
    pillars: ['Health', 'Stealth'],
    thesis:
      'The foundation of the Universal Healing Tao: a Taoist meditation that circulates qi in a loop up the spine and down the front of the body to build, store, and refine vital energy.',
    ideas: [
      'Two channels form the orbit: the Governor rising up the back and the Conception descending the front.',
      'The tongue touches the roof of the mouth to connect the two channels.',
      'Attention leads energy, point by point, starting and ending at the lower dantian below the navel.',
      'Close every practice by storing energy in the dantian.',
    ],
    angles: [
      'A 10-minute guided orbit for the Vitaegis meditation library.',
      'Energy as currency: store it, don’t leak it.',
      'The orbit mapped on a glowing wireframe body.',
      'The bridge between Tai Chi, qigong, and TCM content.',
    ],
    search: 'mantak chia awaken healing energy tao',
  },
  {
    code: 'MM',
    title: 'The Multi-Orgasmic Man',
    author: 'Mantak Chia & Douglas Abrams',
    year: '1996',
    pillars: ['Health'],
    thesis:
      'Taoist sexual cultivation for men in modern language. Sexual energy (jing) is treated as a core reserve of vitality to conserve and circulate, building directly on the Microcosmic Orbit.',
    ideas: [
      'Taoist practice treats orgasm and ejaculation as separable, and teaches men to tell them apart.',
      'Pelvic floor training for control and circulation.',
      'Breath and attention move arousal energy up the spine through the orbit.',
      'Conserving jing is framed as the root of vitality, longevity, and focus.',
    ],
    angles: [
      'Men’s vitality: pelvic floor training, breath, and energy retention.',
      'Taoist practice alongside the clinical evidence on the ED page.',
      'Jing as the ultimate stealth wealth: the reserve you don’t waste.',
    ],
    search: 'multi-orgasmic man mantak chia',
  },
  {
    code: 'PR',
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    year: '1532',
    pillars: ['Wealth', 'Stealth'],
    thesis:
      'A clear-eyed manual on gaining and holding power, written about how people actually behave rather than how they should.',
    ideas: [
      'Virtù (skill and will) versus fortuna (luck): prepare so luck matters less.',
      'Rely on your own foundations, not borrowed strength.',
      'Reputation is managed. Appearances shape power.',
      'Act decisively. Half-measures create enemies without gaining ground.',
    ],
    angles: [
      'Own your stack: self-hosted platforms over rented audiences.',
      'Build reserves before the flood: emergency funds and health.',
      'Personal brand as statecraft.',
      'Discipline over motivation: virtù as a daily practice.',
    ],
    quotes: [
      {
        text: 'It is much safer to be feared than loved, when, of the two, either must be dispensed with.',
        source: 'W. K. Marriott translation, 1908',
      },
    ],
    search: 'the prince machiavelli',
  },
  {
    code: 'SR',
    title: 'Self-Reliance',
    author: 'Ralph Waldo Emerson',
    year: '1841',
    pillars: ['Wealth', 'Stealth'],
    thesis:
      'Trust your own mind over the crowd, tradition, and approval. Emerson argues that conformity wastes a person, and that original thought and action are the only real source of power.',
    ideas: [
      'Your own intuition is worth more than borrowed opinion.',
      'Conformity and the fear of looking inconsistent keep people small.',
      'Greatness is often misunderstood at first.',
      'Real wealth and security come from within, not from property or institutions.',
    ],
    angles: [
      'Sovereign creator: build your own platform and path.',
      'Trust your body’s signals over trends.',
      'Change your mind in public when you learn something new.',
      'Stealth wealth as inner independence.',
    ],
    quotes: [
      { text: 'Trust thyself: every heart vibrates to that iron string.', source: 'Emerson, 1841' },
      { text: 'A foolish consistency is the hobgoblin of little minds.', source: 'Emerson, 1841' },
    ],
    search: 'self-reliance emerson',
  },
  {
    code: 'LF',
    title: 'Love, Freedom, and Aloneness',
    author: 'Osho',
    year: '2001',
    pillars: ['Health', 'Stealth'],
    thesis:
      'Osho’s talks on relationships argue that real love can only grow between two people who are whole on their own. Aloneness, unlike loneliness, is the ground that love and freedom stand on.',
    ideas: [
      'Aloneness is fullness; loneliness is feeling a lack. Learn to enjoy your own company first.',
      'Love that possesses or demands turns into a prison. Love and freedom have to coexist.',
      'Relating is a living process, while a relationship can harden into a fixed thing.',
      'Meditation comes before love: awareness keeps love from turning into need.',
    ],
    angles: [
      'Solo practice as self-love: meditation, Tai Chi, and time alone.',
      'Sovereign relationships: two whole people, not two halves.',
      'Freedom as a wellness metric for how you live and love.',
    ],
    search: 'love freedom aloneness osho',
  },
  {
    code: 'PH',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    year: '1923',
    pillars: ['Health', 'Wealth'],
    thesis:
      'A departing sage answers the townspeople’s questions on love, work, children, pain, freedom, and death. Poetic prose on living with openness and meaning.',
    ideas: [
      'Joy and sorrow come from the same source.',
      'Work done with love is a form of devotion.',
      'True giving expects nothing back.',
      'Pain breaks the shell that holds understanding.',
    ],
    angles: [
      'Purpose-driven work as the real wealth.',
      'Eating and drinking as ritual: mindful nutrition.',
      'Recovery and pain as teachers.',
    ],
    quotes: [{ text: 'Work is love made visible.', source: 'Kahlil Gibran, 1923' }],
    search: 'the prophet kahlil gibran',
  },
  {
    code: 'AL',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    year: '1988',
    pillars: ['Wealth', 'Health'],
    thesis:
      'A shepherd boy follows a recurring dream across the desert in search of treasure, and learns that the journey toward your purpose is where the treasure really lies.',
    ideas: [
      'Everyone has a calling worth pursuing, a Personal Legend.',
      'Pay attention to the signs along the path.',
      'Fear of failure stops more people than failure does.',
      'What you seek is often closer to home than it seems.',
    ],
    angles: [
      'Transformation stories: body and life as alchemy.',
      'Your Personal Legend as a founder and creator.',
      'Journey-format content: travel and adventure series.',
    ],
    search: 'the alchemist paulo coelho',
  },
  {
    code: 'GV',
    title: 'The Giver',
    author: 'Lois Lowry',
    year: '1993',
    pillars: ['Stealth', 'Health'],
    thesis:
      'In a community engineered for comfort and sameness, a boy chosen to hold humanity’s memories discovers the cost of a life without color, pain, or real choice.',
    ideas: [
      'Comfort bought with conformity erases what makes life vivid.',
      'Memory, including pain, is what gives wisdom.',
      'Numbing feelings dulls joy too.',
      'Seeing the truth brings the duty to act on it.',
    ],
    angles: [
      'Waking up from the matrix: the cyberpunk thread of the brand.',
      'Seeing in color: breaking out of sedated routines.',
      'Carrying memory: ancestral and Eastern wisdom traditions.',
    ],
    search: 'the giver lois lowry',
  },
];

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
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-16 text-center">
          <p className={label}>Vitaegis Books</p>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-7xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            The Canon
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Ten books behind everything we build. Strategy, energy, sovereignty, and purpose, mapped
            to <PillarLinks linkClassName="text-[#00ff00] transition-colors hover:text-white" />.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(['Health', 'Stealth', 'Wealth'] as Pillar[]).map((p) => (
              <span
                key={p}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${pillarStyle[p]}`}
              >
                {p}
              </span>
            ))}
          </div>
        </header>

        <div className="divide-y divide-vitae-green/20 border-y border-vitae-green/20">
          {books.map((b) => (
            <article
              key={b.code}
              id={b.code.toLowerCase()}
              className="grid gap-6 py-12 sm:grid-cols-[7rem_1fr]"
            >
              <div className="flex items-baseline gap-4 sm:flex-col sm:gap-2">
                <span className="text-3xl font-light text-vitae-green">{b.code}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">{b.year}</span>
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
                        <p className="font-light italic text-white/90">&ldquo;{q.text}&rdquo;</p>
                        <cite className="mt-1 block text-[11px] not-italic uppercase tracking-[0.2em] text-white/45">
                          {q.source}
                        </cite>
                      </blockquote>
                    ))}
                  </div>
                )}

                <a
                  href={`https://bookshop.org/search?keywords=${encodeURIComponent(b.search)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block rounded-full border border-vitae-green px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black"
                >
                  Get the book
                </a>
              </div>
            </article>
          ))}
        </div>

        <CategoryPosts posts={morePosts} title="More in Books" />

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          Summaries are original Vitaegis notes. Quotes are from public-domain editions.
        </p>
      </div>
    </main>
  );
}
