'use client';

import { useEffect, useRef, useState } from 'react';
import { GiMeditation, GiYinYang, GiSpiralArrow, GiLotus } from 'react-icons/gi';
import GlassContainer from '@/components/GlassContainer';

const practices = [
  {
    id: 'zen',
    name: 'Zen',
    subtitle: '禅',
    description:
      'Cultivate mindfulness through seated meditation. Find clarity in stillness and awareness in every breath.',
    icon: GiMeditation,
    color: '#00ff00',
    benefits: ['Mental Clarity', 'Stress Relief', 'Present Awareness'],
  },
  {
    id: 'kundalini',
    name: 'Kundalini',
    subtitle: 'कुण्डलिनी',
    description:
      'Awaken dormant energy through dynamic breathwork and movement. Unlock your spiritual potential.',
    icon: GiSpiralArrow,
    color: '#ff6b35',
    benefits: ['Energy Activation', 'Chakra Balance', 'Spiritual Growth'],
  },
  {
    id: 'taichi',
    name: 'Tai Chi',
    subtitle: '太極',
    description:
      'Flow through ancient movements that harmonize body and mind. Experience moving meditation.',
    icon: GiYinYang,
    color: '#4ecdc4',
    benefits: ['Balance', 'Flexibility', 'Inner Peace'],
  },
  {
    id: 'qigong',
    name: 'Qi Gong',
    subtitle: '氣功',
    description:
      'Master the art of energy cultivation. Strengthen your life force through intentional practice.',
    icon: GiLotus,
    color: '#a855f7',
    benefits: ['Vitality', 'Healing', 'Longevity'],
  },
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
      className="relative min-h-screen py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header in Glassmorphic Container */}
        <GlassContainer variant="default" glow={true} className="text-center mb-16 sm:mb-20 p-6 sm:p-8 max-w-3xl mx-auto">
          <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
            The Four Pillars
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">
            Ancient <span className="text-vitae-green">Practices</span>
          </h2>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Master the four foundational disciplines that form the core of Vitaegis.
            Each practice earns unique rewards and unlocks deeper levels of engagement.
          </p>
        </GlassContainer>

        {/* Practice Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {practices.map((practice) => {
            const Icon = practice.icon;
            const isHovered = hoveredCard === practice.id;

            return (
              <div
                key={practice.id}
                className="practice-card opacity-0 translate-y-8 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0"
                onMouseEnter={() => setHoveredCard(practice.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div
                  className="group relative h-full p-6 sm:p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-500 hover:border-white/20 cursor-pointer"
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
                  <div className="relative mb-6">
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${practice.color}20 0%, transparent 100%)`,
                        border: `1px solid ${practice.color}30`,
                      }}
                    >
                      <Icon
                        className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-500"
                        style={{ color: practice.color }}
                      />
                    </div>

                    {/* Floating glow */}
                    <div
                      className="absolute inset-0 rounded-2xl blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                      style={{ background: practice.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-baseline gap-3 mb-2">
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

                    <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6">
                      {practice.description}
                    </p>

                    {/* Benefits */}
                    <div className="flex flex-wrap gap-2">
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
          <button className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white font-medium hover:bg-black/50 hover:border-vitae-green/30 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
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
