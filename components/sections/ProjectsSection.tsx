'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi';
import ProjectGrid from '@/components/ProjectGrid';
import SectionTitle from '@/components/SectionTitle';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - ProjectsSection
   Front-page grid of the standalone project pages, linking to /projects
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => {
                el.classList.add('revealed');
              }, i * 80);
            });
          }
        });
      },
      { threshold: 0.15 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center pt-24 pb-16 text-center"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle tagline="Guides, tools and experiments from the Center for Inner Peace.">
          Projects
        </SectionTitle>

        {/* Three on the front page; the rest live in the Projects menu and on /projects. */}
        <ProjectGrid className="w-full max-w-5xl" only={['/stocks', '/crypto', '/travel']} />

        <Link
          href="/projects"
          className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 glass-panel glass-panel--hover mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white min-h-[44px]"
        >
          View all projects
          <HiArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
