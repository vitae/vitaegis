import type { CSSProperties } from 'react';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { pillars } from '@/lib/pillars';
import SectionTitle from '@/components/SectionTitle';
import LiveStream from '@/components/LiveStream';

export default function PracticesSection() {
  return (
    <section
      id="practices"
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div className="section-container mx-auto w-full">
        <SectionTitle>Live</SectionTitle>
        <LiveStream />
        <GlassContainer variant="default" padding="lg" className="mt-8 w-full sm:mt-10">
          <div className="grid grid-cols-3 divide-x divide-vitae-green/20">
            {pillars.map((pillar) => (
              <div
                key={pillar.slug}
                style={{ '--pc': pillar.color } as CSSProperties}
                className="reveal flex flex-col items-center px-1 sm:px-4"
              >
                <Link
                  href={`/${pillar.slug}`}
                  className="text-base font-bold uppercase tracking-[0.12em] text-[color:var(--pc)] transition hover:text-white sm:text-2xl sm:tracking-[0.2em]"
                  style={
                    {
                      '--pc': pillar.color,
                      textShadow: `0 0 16px ${pillar.color}59`,
                    } as CSSProperties
                  }
                >
                  {pillar.name}
                </Link>
                <ul className="mt-4 flex w-full flex-col gap-1 sm:mt-6 sm:gap-2">
                  {pillar.topics.map((topic) => (
                    <li key={topic.code}>
                      <Link
                        href={`/${pillar.slug}#${topic.code}`}
                        className="flex items-center justify-center text-xs font-normal leading-snug text-white/70 transition hover:text-[color:var(--pc)] sm:text-base"
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
