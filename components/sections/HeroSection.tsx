'use client';

import { useRef, useState, useEffect } from 'react';
import GlassContainer from '@/components/GlassContainer';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - HeroSection Component
   Instagram-Level Polish with Native iOS Feel
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [primaryPressed, setPrimaryPressed] = useState(false);
  const [secondaryPressed, setSecondaryPressed] = useState(false);

  // Intersection observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
          }
        });
      },
      { rootMargin: '100px 0px', threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex flex-col items-center justify-center px-4 sm:px-6"
      style={{ minHeight: '100dvh' }}
    >
      {/* Content container with safe area padding */}
      <div 
        className="w-full max-w-2xl flex flex-col items-center"
        style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}
      >
        
        {/* Badge - Instagram style pill */}
        <div 
          className={`
            flex items-center gap-2
            px-3 sm:px-4 py-1.5 sm:py-2
            rounded-full
            bg-[#00ff00]/10
            border border-[#00ff00]/30
            mb-4 sm:mb-6
            transition-all duration-500
            ${hasBeenVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ transitionDelay: '100ms' }}
        >
          {/* Pulsing dot indicator */}
          <div className="w-3 h-3 sm:w-3 sm:h-3 rounded-full bg-[#00ff00] animate-pulse" />
          <span className="text-xs font-large text-[#00ff00] tracking-wider">
            VITALITY
          </span>
        </div>

        {/* Main title with text gradient */}
        <h1 
          className={`
            text-6xl sm:text-6xl md:text-7xl lg:text-8xl
            font-bold tracking-tight
            bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent
            mb-3 sm:mb-4
            transition-all duration-500
            ${hasBeenVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ 
            transitionDelay: '200ms',
            textShadow: '0 0 60px rgba(255, 255, 255, 0.1)',
          }}
        >
          VITAEGIS
        </h1>

        {/* Animated underline */}
        <div 
          className={`
            w-24 sm:w-32 h-px mb-4 sm:mb-6
            transition-all duration-500
            ${hasBeenVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ 
            transitionDelay: '300ms',
            background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
          }}
        />

        {/* Glassmorphic content card */}
        <GlassContainer 
          variant="default" 
          glow 
          padding="lg"
          className={`
            w-full
            transition-all duration-500
            ${hasBeenVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ transitionDelay: '400ms' }}
        >
          {/* Tagline with Instagram spacing */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <span className="text-lg sm:text-xl font-light text-[#00ff00] tracking-[0.15em] sm:tracking-[0.2em]">
              HEALTH
            </span>
            <span className="text-lg sm:text-xl text-[#00ff00]/50">•</span>
            <span className="text-lg sm:text-xl font-light text-[#00ff00] tracking-[0.15em] sm:tracking-[0.2em]">
              STEALTH
            </span>
            <span className="text-lg sm:text-xl text-[#00ff00]/50">•</span>
            <span className="text-lg sm:text-xl font-light text-[#00ff00] tracking-[0.15em] sm:tracking-[0.2em]">
              WEALTH
            </span>
          </div>

          {/* Description with Instagram typography */}
          <p className="text-sm sm:text-base text-white/70 text-center leading-relaxed mb-5 sm:mb-6">
            Ancient wisdom meets Cyberspirituality:
          </p>
          <p className="text-sm sm:text-base text-green/70 text-center leading-relaxed mb-5 sm:mb-6">
             Evolve your energy with Meditation, Yoga, Tai Chi.
          </p>

          {/* CTA Buttons with touch feedback */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {/* Primary CTA */}
            <button
              onTouchStart={() => setPrimaryPressed(true)}
              onTouchEnd={() => setPrimaryPressed(false)}
              onMouseDown={() => setPrimaryPressed(true)}
              onMouseUp={() => setPrimaryPressed(false)}
              onMouseLeave={() => setPrimaryPressed(false)}
              className="
                w-full sm:w-auto
                px-5 sm:px-6 py-3
                bg-[#00ff00] text-black
                font-medium text-sm sm:text-base
                rounded-lg
                min-h-[44px]
                transition-all duration-200
              "
              style={{
                transform: primaryPressed ? 'scale(0.97)' : 'scale(1)',
                boxShadow: primaryPressed 
                  ? 'none' 
                  : '0 0 20px rgba(0, 255, 65, 0.5)',
              }}
            >
              Enter Vitaegis
            </button>

            {/* Secondary CTA */}
            <button
              onTouchStart={() => setSecondaryPressed(true)}
              onTouchEnd={() => setSecondaryPressed(false)}
              onMouseDown={() => setSecondaryPressed(true)}
              onMouseUp={() => setSecondaryPressed(false)}
              onMouseLeave={() => setSecondaryPressed(false)}
              className="
                w-full sm:w-auto
                px-5 sm:px-6 py-3
                bg-white/10 text-white
                border border-white/20
                font-medium text-sm sm:text-base
                rounded-lg
                min-h-[44px]
                transition-all duration-200
                hover:bg-white/15
              "
              style={{
                transform: secondaryPressed ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              Buy Our Book
            </button>
          </div>
        </GlassContainer>
      </div>

      {/* Scroll indicator - positioned above bottom nav on mobile */}
      <div 
        className={`
          absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2
          flex flex-col items-center gap-1
          transition-all duration-500
          ${hasBeenVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ transitionDelay: '600ms' }}
      >
        <span className="text-xs text-white/50 tracking-widest uppercase">
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
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 0, 0.5) 0%, transparent 50%)',
        }}
      />
    </section>
  );
}
