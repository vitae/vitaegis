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
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center text-center"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <div className="w-full max-w-3xl mx-auto">
          {/* Text Content in Glassmorphic Container */}
          <GlassContainer
            variant="default"
            glow={true}
            className="p-3 sm:p-6 lg:p-10 w-full max-w-full"
          >
            {/* Section Label */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
              <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
                About Vitaegis
              </span>
            </div>

            {/* Main Heading */}
            <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Advanced Intelligence
              <br />
              <span className="bg-gradient-to-r from-vitae-green to-emerald-400 bg-clip-text text-transparent">
                as a Service
              </span>
            </h2>

            {/* Description */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-6 space-y-4 text-white/70 text-base sm:text-lg leading-relaxed">
              <p>
                Vitaegis is a portmanteau of <em>Vitae</em> and <em>Aegis</em>: life energy.
              </p>
              <p>
                We run it as an intelligence layer. Intelligence orchestrated agentically over
                curated knowledge, served through streaming APIs on serverless infrastructure.
                Turning ideas into reality, in real time.
              </p>
            </div>

            {/* CTA Link */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8">
              <button className="group inline-flex items-center gap-2 text-vitae-green font-medium tracking-[0.2em] hover:gap-4 transition-all duration-300">
                LEARN OUR SECRETS
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
        </div>

        {/* Bottom decorative line */}
        <div className="reveal opacity-0 transition-all duration-1000 [&.revealed]:opacity-100 mt-20 flex items-center justify-center">
          <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}
