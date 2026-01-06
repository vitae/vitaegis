'use client';

import { useEffect, useRef, useState } from 'react';
import { GiMeditation, GiYinYang, GiLotus, GiLotusFlower } from 'react-icons/gi';
import GlassContainer from '@/components/GlassContainer';

const practices = [
  {
    id: 'zen',
    name: 'Zen Meditation',
    subtitle: '禅',
    description:
      'Cultivate awareness through breathing exercises. Find stillness and peace in every breath.',
    icon: GiMeditation,
    color: '#00ff00',
    benefits: ['Clarity', 'Breath', 'Peace'],
  },
  {
    id: 'yoga',
    name: 'Kundalini Yoga',
    subtitle: 'कुण्डलिनी',
    description:
      'Awaken dormant energy through dynamic movement. Unlock your spiritual potential.',
    icon: GiLotus,
    color: '#ff00ff',
    benefits: ['Flexibility', 'Strength', 'Love'],
  },
  {
    id: 'taichi',
    name: 'Yang Tai Chi',
    subtitle: '太極',
    description:
      'Master the Art of Energy. Flow through ancient movements that harmonize body and mind.',
    icon: GiYinYang,
    color: '#4ecdc4',
    benefits: ['Balance', 'Energy', 'Vitality'],
  }
];

export default function PracticesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.practice-card').forEach((el, i) => {
              setTimeout(() => {
                el.classList.add('revealed');
              }, i * 150);
            });
          }
        });
      },
      { threshold: 0.1 }
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
      className="relative min-h-screen flex flex-col items-center justify-center text-center"
    >
      <div className="section-container flex flex-col items-center justify-center mx-auto" style={{ width: '100%' }}>
        {/* Section Header in Glassmorphic Container */}
        <GlassContainer variant="default" glow={true} className="text-center mb-16 sm:mb-20 p-6 sm:p-8 max-w-3xl mx-auto">
          <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
            The Three Pillars
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">
            Ancient <span className="text-vitae-green">Practices</span>
          </h2>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Master the foundational disciplines that form the core of Vitaegis.
            Each practice provides unique rewards and unlocks higher levels of evolution.
          </p>
        </GlassContainer>

        {/* Practice Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {practices.map((practice) => {
            const Icon = practice.icon as React.ComponentType<any>;
            const isHovered = hoveredCard === practice.id;

            return (
              <div
                key={practice.id}
                className="practice-card flex justify-center items-center opacity-0 translate-y-8 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0"
                onMouseEnter={() => setHoveredCard(practice.id ?? null)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div
                  className="group relative flex flex-col items-center justify-center w-[90vw] h-[90vw] max-w-[340px] max-h-[340px] sm:w-[440px] sm:h-[440px] rounded-full bg-black/3 backdrop-blur-sm border border-white/10 overflow-hidden transition-all duration-500 hover:border-white/20 cursor-pointer text-center"
                  style={{
                    boxShadow: isHovered
                      ? `0 0 40px ${practice.color}20, inset 0 0 40px ${practice.color}05`
                      : 'none',
                  }}
                >
                  {/* Background glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${practice.color}10 0%, transparent 70%)`,
                    }}
                  />

                  {/* Icon */}
                  <div className="relative mb-6 flex flex-col items-center justify-center">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 border-2"
                      style={{
                        background: `linear-gradient(135deg, ${practice.color}20 0%, transparent 100%)`,
                        border: `2px solid ${practice.color}30`,
                      }}
                    >
                      <Icon size={48} color={practice.color} />
                    </div>

                    {/* Floating glow */}

                    <div
                      className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                      style={{ background: practice.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="relative flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-1 mb-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-white transition-colors">
                        {practice.name}
                      </h3>
                      <span
                        className="text-lg sm:text-xl opacity-40 group-hover:opacity-70 transition-opacity"
                        style={{ color: practice.color }}
                      >
                        {practice.subtitle}
                      </span>
                    </div>

                    <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6 text-center">
                      {practice.description}
                    </p>

                    {/* Benefits */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {practice.benefits.map((benefit) => (
                        <span
                          key={benefit}
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-300"
                          style={{
                            background: `${practice.color}15`,
                            color: practice.color,
                            border: `1px solid ${practice.color}30`,
                          }}
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div
                    className="absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                    style={{
                      background: `${practice.color}20`,
                      border: `1px solid ${practice.color}50`,
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={practice.color}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <button className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 text-white font-medium hover:bg-black/25 hover:border-vitae-green/30 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
            <span>Explore All Practices</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
