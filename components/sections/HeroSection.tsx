'use client';

import { useEffect, useRef } from 'react';
import { HiChevronDown, HiArrowRight, HiDownload } from 'react-icons/hi';
import GlassButton from '@/components/GlassButton';
import GlassContainer from '@/components/GlassContainer';

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
      className="relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{ minHeight: '100dvh' }}
    >
      <div className="text-center max-w-5xl mx-auto pt-16 md:pt-20">
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-vitae-green/10 border border-vitae-green/30 mb-4 sm:mb-8 animate-fade-in-up backdrop-blur-sm">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-vitae-green rounded-full animate-pulse shadow-[0_0_10px_#00ff00]" />
          <span className="text-vitae-green text-xs sm:text-sm font-medium tracking-wider">
            DECENTRALIZED VITALITY
          </span>
        </div>

        {/* Main Title - NO glassmorphic container */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 sm:mb-6 opacity-0 translate-y-8 transition-all duration-1000 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
        >
          <span className="block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            VITAEGIS
          </span>
        </h1>

        {/* Animated underline */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="h-px w-24 sm:w-48 bg-gradient-to-r from-transparent via-vitae-green to-transparent animate-pulse" />
        </div>

        {/* Glassmorphic container for tagline, description, and CTAs */}
        <GlassContainer 
          variant="default" 
          glow={true}
          className="p-4 sm:p-6 md:p-10 animate-fade-in-up animation-delay-200"
        >
          {/* Tagline */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 font-light tracking-[0.2em] sm:tracking-[0.3em] mb-4 sm:mb-6">
            <span className="text-vitae-green">HEALTH</span>
            <span className="mx-3 sm:mx-4 text-white/30">•</span>
            <span className="text-white">STEALTH</span>
            <span className="mx-3 sm:mx-4 text-white/30">•</span>
            <span className="text-vitae-green">WEALTH</span>
          </p>

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Ancient wisdom meets cyberpunk technology. Transform your practice through
            the convergence of Zen, Kundalini, Tai Chi, and Qi Gong—powered by Web3.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <GlassButton
              variant="primary"
              size="lg"
              icon={<HiArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Enter the Matrix
            </GlassButton>

            <GlassButton
              variant="secondary"
              size="lg"
              icon={<HiDownload className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Read Whitepaper
            </GlassButton>
          </div>
        </GlassContainer>
      </div>

      {/* Scroll indicator - positioned above bottom nav on mobile */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-vitae-green transition-colors duration-300 animate-bounce"
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

