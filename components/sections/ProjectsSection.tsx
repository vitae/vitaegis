'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi';
import GlassContainer from '@/components/GlassContainer';
import ProjectGrid from '@/components/ProjectGrid';

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
      className="relative min-h-screen flex flex-col items-center justify-center text-center py-16"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <GlassContainer
          variant="default"
          glow={true}
          className="text-center mb-8 sm:mb-12 p-4 sm:p-8 w-full max-w-3xl mx-auto"
        >
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
            <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
              Explore
            </span>
          </div>

          <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">
            Our <span className="text-vitae-green">Projects</span>
          </h2>

          <p className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Guides, tools and experiments from the Center for Inner Peace.
          </p>
        </GlassContainer>

        <ProjectGrid className="w-full max-w-5xl" />

        <Link
          href="/projects"
          className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white/10 border border-white/20 text-sm font-medium text-white hover:bg-white/15 min-h-[44px]"
        >
          View all projects
          <HiArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
