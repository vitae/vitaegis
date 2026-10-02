'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { pillars } from '@/lib/pillars';
import SectionTitle from '@/components/SectionTitle';
import LiveStream from '@/components/LiveStream';

export default function PracticesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.pillar-column').forEach((el, i) => {
              setTimeout(() => {
                el.classList.add('revealed');
              }, i * 150);
            });
          }
        });
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="practices"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center pt-8 pb-16 text-center sm:pt-10"
    >
      <div className="section-container mx-auto w-full">
        <SectionTitle>Live</SectionTitle>
        <LiveStream />
        <GlassContainer
          variant="default"
          glow={true}
          className="mx-auto mt-10 max-w-4xl p-4 sm:p-8"
        >
          <div className="grid grid-cols-3 divide-x divide-vitae-green/20">
            {pillars.map((pillar) => (
              <div
                key={pillar.slug}
                className="pillar-column flex flex-col items-center px-1 opacity-0 translate-y-8 transition-all duration-700 sm:px-4 [&.revealed]:opacity-100 [&.revealed]:translate-y-0"
              >
                <Link
                  href={`/${pillar.slug}`}
                  className="text-base font-bold uppercase tracking-[0.12em] text-vitae-green transition hover:text-white sm:text-2xl sm:tracking-[0.2em]"
                  style={{ textShadow: '0 0 16px rgba(0,255,0,0.35)' }}
                >
                  {pillar.name}
                </Link>
                <ul className="mt-4 flex w-full flex-col gap-1 sm:mt-6 sm:gap-2">
                  {pillar.topics.map((topic) => (
                    <li key={topic.code}>
                      <Link
                        href={`/${pillar.slug}#${topic.code}`}
                        className="flex items-center justify-center text-xs font-light leading-snug text-white/70 transition hover:text-vitae-green sm:text-base"
                      >
                        {topic.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
