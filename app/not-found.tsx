import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Not found | VITAEGIS' };

export default function NotFound() {
  return (
    <main className="flex min-h-[70svh] w-full flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-vitae-green/80">Error 404</p>
      <h1
        className="mt-4 text-5xl font-bold uppercase tracking-[0.18em] text-white sm:text-7xl"
        style={{ textShadow: '0 0 28px rgba(0,255,0,0.25)' }}
      >
        Off the grid
      </h1>
      <p className="mt-5 max-w-md text-base font-light text-white/70 sm:text-lg">
        Nothing lives at this address. The page may have moved, or the link was mistyped.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-vitae-green px-6 text-sm font-medium tracking-[0.08em] text-black shadow-neon-sm transition-shadow hover:shadow-neon-md"
        >
          BACK TO VITAEGIS
        </Link>
        <Link
          href="/projects"
          className="glass-panel glass-panel--hover inline-flex min-h-[48px] items-center justify-center rounded-lg px-6 text-sm font-medium text-white"
        >
          All projects
        </Link>
      </div>
    </main>
  );
}
