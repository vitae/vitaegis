'use client';

import { useEffect, useRef } from 'react';
import GlassContainer from '@/components/GlassContainer';

export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => {
                el.classList.add('revealed');
              }, i * 100);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    { value: '3M+', label: 'Active Users' },
    { value: '$2.5M', label: 'TVL Locked' },
    { value: '3', label: 'Ancient Practices' },
    { value: '∞', label: 'Potential' },
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center text-center"
    >
      <div className="section-container flex flex-col items-center justify-center mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Text Content in Glassmorphic Container */}
          <GlassContainer variant="default" glow={true} className="p-6 sm:p-8 lg:p-10">
            {/* Section Label */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
              <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
                About Vitaegis
              </span>
            </div>

            {/* Main Heading */}
            <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Where Ancient{' '}
              <span className="text-vitae-green">Wisdom</span>
              <br />
              Meets Cyber{' '}
              <span className="bg-gradient-to-r from-vitae-green to-emerald-400 bg-clip-text text-transparent">
                Spirituality
              </span>
            </h2>

            {/* Description */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-6 space-y-4 text-white/70 text-base sm:text-lg leading-relaxed">
              <p>
                Vitaegis is a portmanteau of the words Vitae and Aegis, which means the protection of life. Vitaegis bridges millennia of spiritual wisdom with modern cyber technology. True wellness extends beyond the physical: it encompasses mind, body, spirit, and now; cyber presence. <br />
                </p> 
              <p>
                We will help you to look within and find inner peace through foundational practices and secret knowledge. Join our community united in our shared pursuit of wellness and enhanced life experiences. <br />
              </p>
            </div>

            {/* CTA Link */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8">
              <button className="group inline-flex items-center gap-2 text-vitae-green font-medium hover:gap-4 transition-all duration-300">
                Learn our secrets
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </div>
          </GlassContainer>

          {/* Right Column - Stats Grid with enhanced glassmorphic style */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 group relative p-6 sm:p-8 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 hover:bg-black/25 hover:border-vitae-green/30 transition-all cursor-default ${
                  index % 2 === 1 ? 'lg:translate-y-8' : ''
                }`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-3xl bg-vitae-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                <div className="relative">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 group-hover:text-vitae-green transition-colors duration-300">
                    {stat.value}
                  </div>
                  <div className="text-sm sm:text-base text-white/50 tracking-wide">
                    {stat.label}
                  </div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-vitae-green/30 group-hover:bg-vitae-green group-hover:shadow-[0_0_10px_#00ff00] transition-all duration-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="reveal opacity-0 transition-all duration-1000 [&.revealed]:opacity-100 mt-20 flex items-center justify-center">
          <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}
