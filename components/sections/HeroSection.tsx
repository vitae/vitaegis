'use client';

import Link from 'next/link';

import { useRef, useState, useEffect } from 'react';
import GlassContainer from '@/components/GlassContainer';
import LogoGlow from '@/components/LogoGlow';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - HeroSection Component
   Instagram-Level Polish with Native iOS Feel
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [primaryPressed, setPrimaryPressed] = useState(false);

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
      { rootMargin: '100px 0px', threshold: 0.1 },
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
      className="relative mb-8 flex min-h-screen flex-col items-center justify-center text-center sm:mb-10"
      style={{ minHeight: 'calc(100svh - var(--nav-top) - var(--nav-bottom) - var(--sab))' }}
    >
      {/* Content container with safe area padding and global alignment */}
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ paddingTop: '1rem', width: '100%' }}
      >
        {/* The mark: lit green glass with lightning running through it */}
        <h1
          className={`
            w-[min(92vw,720px)] mb-3 sm:mb-4
            transition-all duration-700
            ${hasBeenVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
          `}
          style={{ transitionDelay: '200ms' }}
        >
          <LogoGlow />
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
          {/* Brand descriptor */}
          <p className="text-sm sm:text-lg md:text-xl text-[#00ff00] text-center tracking-[0.2em] uppercase mb-4 sm:mb-5">
            Center for Inner Peace
          </p>

          {/* Pillars: three equal columns spanning the card, one word centred in each */}
          <div className="grid w-full grid-cols-3 items-center mb-6 sm:mb-8">
            {(
              [
                ['/health', 'HEALTH'],
                ['/stealth', 'STEALTH'],
                ['/wealth', 'WEALTH'],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="block text-center whitespace-nowrap text-base sm:text-2xl md:text-3xl lg:text-4xl font-light text-[#00ff00] tracking-[0.1em] sm:tracking-[0.2em] transition-colors hover:text-white focus-visible:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons with touch feedback */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {/* Primary CTA */}
            <button
              onClick={() =>
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
              }
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
                boxShadow: primaryPressed ? 'none' : '0 0 20px rgba(0, 255, 0, 0.5)',
              }}
            >
              ENTER VITAEGIS
            </button>
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
