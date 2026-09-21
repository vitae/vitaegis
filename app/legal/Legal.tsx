import Link from 'next/link';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export function LegalPage({
  kicker,
  title,
  intro,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    // Matches /run and /travel: the global CSS pins <html> in some browsers, so the
    // page scrolls inside its own full-viewport container.
    <main
      className="fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif", WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="relative mx-auto max-w-3xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="pb-8 pt-12">
          <p className={label}>{kicker}</p>
          <h1
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-5xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            {title}
          </h1>
          <p className="mt-6 text-lg font-light leading-relaxed text-white/70">{intro}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/40">Last updated {updated}</p>
        </header>

        <div className={`${glass} p-6 sm:p-10`}>{children}</div>
      </div>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-vitae-green/15 py-7 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-wide text-white sm:text-2xl">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm font-light leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map(([term, body]) => (
        <li key={term} className="flex gap-3">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-vitae-green" />
          <span>
            <span className="font-medium text-white">{term}</span>{' '}
            <span className="text-white/70">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
