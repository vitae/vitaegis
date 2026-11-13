import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi';
import ProjectGrid from '@/components/ProjectGrid';
import SectionTitle from '@/components/SectionTitle';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - ProjectsSection
   Front-page grid of the standalone project pages, linking to /projects
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ProjectsSection() {
  return (
    <section
      id="projects"
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle tagline="Guides, tools and experiments from the Center for Inner Peace.">
          Projects
        </SectionTitle>

        {/* Three on the front page; the rest live in the Projects menu and on /projects. */}
        <ProjectGrid className="w-full" only={['/stocks', '/crypto', '/travel']} />

        <Link
          href="/projects"
          className="reveal glass-panel glass-panel--hover mt-8 sm:mt-10 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white min-h-[44px]"
        >
          View all projects
          <HiArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
