import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PILLAR_COLORS } from '@/lib/pillars';
import GlassContainer from '@/components/GlassContainer';
import LogoGlow from '@/components/LogoGlow';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - HeroSection
   Server-rendered. The entrance is CSS only, so the mark is on screen with the first
   paint instead of waiting for JavaScript.
   ═══════════════════════════════════════════════════════════════════════════════ */

const PILLARS = [
  ['/health', 'HEALTH', PILLAR_COLORS.health],
  ['/stealth', 'STEALTH', PILLAR_COLORS.stealth],
  ['/wealth', 'WEALTH', PILLAR_COLORS.wealth],
] as const;

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center text-center"
      style={{ minHeight: 'calc(100svh - var(--nav-top) - var(--nav-bottom) - var(--sab))' }}
    >
      <div className="section-container">
        <h1 className="mb-3 w-[min(92vw,720px)] sm:mb-4">
          <LogoGlow />
        </h1>

        <div
          className="hero-in mb-4 h-px w-24 sm:mb-6 sm:w-32"
          style={
            {
              '--d': '300ms',
              background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
            } as CSSProperties
          }
        />

        <GlassContainer
          variant="default"
          glow
          lit
          padding="lg"
          className="hero-in w-full max-w-3xl"
          style={{ '--d': '400ms' } as CSSProperties}
        >
          <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
            <p className="text-center text-sm uppercase tracking-[0.2em] text-vitae-green sm:text-lg md:text-xl">
              Center for Inner Peace
            </p>

            <div className="grid w-full grid-cols-3 items-center">
              {PILLARS.map(([href, label, color]) => (
                <Link
                  key={href}
                  href={href}
                  style={{ '--pc': color } as CSSProperties}
                  className="block whitespace-nowrap text-center text-base font-light tracking-[0.1em] text-[color:var(--pc)] transition-colors hover:text-white focus-visible:text-white sm:text-2xl sm:tracking-[0.2em] md:text-3xl lg:text-4xl"
                >
                  {label}
                </Link>
              ))}
            </div>

            <a
              href="#token"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-vitae-green px-8 py-3 text-sm font-medium tracking-[0.08em] text-black shadow-neon-sm transition-[box-shadow,transform] duration-200 hover:shadow-neon-md active:scale-[0.97] active:shadow-none sm:w-auto sm:text-base"
            >
              ENTER
            </a>
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
