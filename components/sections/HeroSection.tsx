'use client';

import { useEffect, useRef } from 'react';
import { HiChevronDown } from 'react-icons/hi';

export default function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (titleRef.current) {
      observer.observe(titleRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
    >
      <div className="text-center max-w-5xl mx-auto">
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vitae-green/10 border border-vitae-green/30 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 bg-vitae-green rounded-full animate-pulse shadow-[0_0_10px_#00ff41]" />
          <span className="text-vitae-green text-sm font-medium tracking-wider">
            DECENTRALIZED VITALITY
          </span>
        </div>

        {/* Main Title */}
        <h1
          ref={titleRef}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6 opacity-0 translate-y-8 transition-all duration-1000 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
        >
          <span className="block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
            VITAEGIS
          </span>
        </h1>

        {/* Animated underline */}
        <div className="flex justify-center mb-8">
          <div className="h-px w-32 sm:w-48 bg-gradient-to-r from-transparent via-vitae-green to-transparent animate-pulse" />
        </div>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl md:text-3xl text-white/80 font-light tracking-[0.3em] mb-12 animate-fade-in-up animation-delay-200">
          <span className="text-vitae-green">HEALTH</span>
          <span className="mx-3 sm:mx-4 text-white/30">•</span>
          <span className="text-white">STEALTH</span>
          <span className="mx-3 sm:mx-4 text-white/30">•</span>
          <span className="text-vitae-green">WEALTH</span>
        </p>

        {/* Description */}
        <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up animation-delay-400">
          Ancient wisdom meets cyberpunk technology. Transform your practice through
          the convergence of Zen, Kundalini, Tai Chi, and Qi Gong—powered by Web3.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-fade-in-up animation-delay-600">
          <button className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-vitae-green text-black font-semibold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,65,0.4)]">
            <span className="relative z-10 flex items-center justify-center gap-2">
              Enter the Matrix
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
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-vitae-green via-emerald-400 to-vitae-green opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          <button className="group w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 text-white font-medium text-lg transition-all duration-300 hover:bg-white/5 hover:border-white/40">
            <span className="flex items-center justify-center gap-2">
              Read Whitepaper
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-vitae-green transition-colors duration-300 animate-bounce"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <HiChevronDown size={24} />
      </button>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-8 w-px h-32 bg-gradient-to-b from-transparent via-vitae-green/30 to-transparent hidden lg:block" />
      <div className="absolute top-1/3 right-8 w-px h-48 bg-gradient-to-b from-transparent via-vitae-green/20 to-transparent hidden lg:block" />
      <div className="absolute bottom-1/4 left-16 w-24 h-px bg-gradient-to-r from-vitae-green/30 to-transparent hidden lg:block" />
    </section>
  );
}
