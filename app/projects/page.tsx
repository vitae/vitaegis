import type { Metadata } from 'next';
import Link from 'next/link';
import ProjectGrid from '@/components/ProjectGrid';
import SectionTitle from '@/components/SectionTitle';

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
    <main className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6">
        <section className="relative flex flex-col items-center py-10 text-center sm:py-14">
          <SectionTitle
            as="h1"
            tagline="Guides, tools and experiments. Each one is a standalone page. Pick one to dive in."
          >
            Projects
          </SectionTitle>

          <ProjectGrid reveal={false} className="w-full" />

          <Link href="/" className={`${label} mt-8 hover:text-white sm:mt-10`}>
            ← Vitaegis
          </Link>
        </section>
      </div>
    </main>
  );
}
