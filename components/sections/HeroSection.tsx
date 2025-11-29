'use client';

import { useRef } from 'react';
import GlassContainer from '@/components/GlassContainer';
import { useTouchFeedback, useIntersectionPreload } from '@/hooks/useNativeScroll';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - HeroSection Component
   Instagram-Level Polish with Native iOS Feel
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenVisible } = useIntersectionPreload(sectionRef);
  
  // Touch feedback for CTA buttons
  const primaryCta = useTouchFeedback();
  const secondaryCta = useTouchFeedback();

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex flex-col items-center justify-center px-ig-4 sm:px-ig-6"
      style={{ minHeight: '100dvh' }}
    >
      {/* Content container with safe area padding */}
      <div className="w-full max-w-2xl flex flex-col items-center pt-safe">
        
        {/* Badge - Instagram style pill */}
        <div 
          className={`
            flex items-center gap-ig-2
            px-ig-3 sm:px-ig-4 py-[6px] sm:py-ig-2
            rounded-full
            bg-vitae-green/10
            border border-vitae-green/30
            mb-ig-4 sm:mb-ig-6
            ${hasBeenVisible ? 'animate-fade-in-up' : 'opacity-0'}
          `}
          style={{ animationDelay: '100ms' }}
        >
          {/* Pulsing dot indicator */}
          <div 
            className="w-[6px] h-[6px] sm:w-ig-2 sm:h-ig-2 rounded-full bg-vitae-green animate-pulse-glow"
          />
          <span className="text-ig-xs font-medium text-vitae-green tracking-wider">
            DECENTRALIZED VITALITY
          </span>
        </div>

        {/* Main title with text gradient */}
        <h1 
          className={`
            text-[40px] sm:text-6xl md:text-7xl lg:text-8xl
            font-bold tracking-tight
            bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent
            mb-ig-3 sm:mb-ig-4
            drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]
            ${hasBeenVisible ? 'animate-fade-in-up' : 'opacity-0'}
          `}
          style={{ animationDelay: '200ms' }}
        >
          VITAEGIS
        </h1>

        {/* Animated underline */}
        <div 
          className={`
            w-24 sm:w-32 h-px
            bg-gradient-to-r from-transparent via-vitae-green to-transparent
            mb-ig-4 sm:mb-ig-6
            ${hasBeenVisible ? 'animate-fade-in-up' : 'opacity-0'}
          `}
          style={{ animationDelay: '300ms' }}
        />

        {/* Glassmorphic content card */}
        <GlassContainer 
          variant="default" 
          glow 
          padding="lg"
          className={`
            w-full
            ${hasBeenVisible ? 'animate-fade-in-up' : 'opacity-0'}
          `}
          style={{ animationDelay: '400ms' }}
        >
          {/* Tagline with Instagram spacing */}
          <div className="flex flex-wrap items-center justify-center gap-ig-2 sm:gap-ig-3 mb-ig-4 sm:mb-ig-5">
            <span className="text-ig-lg sm:text-ig-xl font-light text-vitae-green tracking-[0.15em] sm:tracking-[0.2em]">
              HEALTH
            </span>
            <span className="text-ig-lg sm:text-ig-xl text-white/30">•</span>
            <span className="text-ig-lg sm:text-ig-xl font-light text-white tracking-[0.15em] sm:tracking-[0.2em]">
              STEALTH
            </span>
            <span className="text-ig-lg sm:text-ig-xl text-white/30">•</span>
            <span className="text-ig-lg sm:text-ig-xl font-light text-vitae-green tracking-[0.15em] sm:tracking-[0.2em]">
              WEALTH
            </span>
          </div>

          {/* Description with Instagram typography */}
          <p className="text-ig-sm sm:text-ig-base text-white/70 text-center leading-relaxed mb-ig-5 sm:mb-ig-6">
            Ancient wisdom meets cyberpunk technology. Transform your practice through the 
            convergence of Zen, Kundalini, Tai Chi, and Qi Gong—powered by Web3.
          </p>

          {/* CTA Buttons with touch feedback */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-ig-3 sm:gap-ig-4">
            {/* Primary CTA */}
            <button
              {...primaryCta.handlers}
              className="
                w-full sm:w-auto
                px-ig-5 sm:px-ig-6 py-ig-3
                bg-vitae-green text-black
                font-medium text-ig-sm sm:text-ig-base
                rounded-ig-md
                shadow-neon
                transition-all duration-200 ease-ios-spring
                active:shadow-none
                min-h-[44px]
                touch-manipulation
                gpu-accelerate
              "
              style={primaryCta.style}
            >
              Enter the Matrix
            </button>

            {/* Secondary CTA */}
            <button
              {...secondaryCta.handlers}
              className="
                w-full sm:w-auto
                px-ig-5 sm:px-ig-6 py-ig-3
                bg-white/10 text-white
                border border-white/20
                font-medium text-ig-sm sm:text-ig-base
                rounded-ig-md
                transition-all duration-200 ease-ios-spring
                hover:bg-white/15
                min-h-[44px]
                touch-manipulation
                gpu-accelerate
              "
              style={secondaryCta.style}
            >
              Read Whitepaper
            </button>
          </div>
        </GlassContainer>
      </div>

      {/* Scroll indicator - positioned above bottom nav on mobile */}
      <div 
        className={`
          absolute bottom-24 md:bottom-ig-8 left-1/2 -translate-x-1/2
          flex flex-col items-center gap-ig-1
          ${hasBeenVisible ? 'animate-float' : 'opacity-0'}
        `}
        style={{ animationDelay: '600ms' }}
      >
        <span className="text-ig-xs text-white/50 tracking-widest uppercase">
          Scroll
        </span>
        <svg 
          className="w-5 h-5 text-white/50 animate-bounce" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Ambient glow effect */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 65, 0.08) 0%, transparent 70%)',
        }}
      />
    </section>
  );
}
