import type { Metadata } from 'next';
import Link from 'next/link';
import ProjectGrid from '@/components/ProjectGrid';

export const metadata: Metadata = {
  title: 'Projects | VITAEGIS',
  description:
    'Guides, tools and experiments from the Center for Inner Peace — happy hours, flight radar, running routes, the daily stack, proverbs and more.',
  openGraph: {
    title: 'Projects | VITAEGIS',
    description: 'Guides, tools and experiments from the Center for Inner Peace.',
    type: 'website',
  },
};

const label = 'text-xs uppercase tracking-[0.3em] text-vitae-green/70';

export default function ProjectsPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-12 sm:py-16 text-center">
          <p className={label}>Center for Inner Peace</p>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold">
            Our <span className="text-vitae-green">Projects</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-base sm:text-lg text-white/70">
            Guides, tools and experiments. Each one is a standalone page — pick one to dive in.
          </p>
        </header>

        <ProjectGrid reveal={false} />
      </div>
    </main>
  );
}
