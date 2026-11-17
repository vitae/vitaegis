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
        <h1 className="mb-6 w-[min(92vw,720px)] sm:mb-8">
          <LogoGlow />
        </h1>

        <GlassContainer
          variant="default"
          glow
          lit
          padding="lg"
          className="hero-in w-full max-w-3xl"
          style={{ '--d': '400ms' } as CSSProperties}
        >
          <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
            <p className="text-center !leading-none text-base font-medium uppercase tracking-[0.15em] sm:text-xl sm:tracking-[0.2em] md:text-2xl text-vitae-green">
              Center for Inner Peace
            </p>

            <div className="grid w-full grid-cols-3 items-center">
              {PILLARS.map(([href, label, color]) => (
                <Link
                  key={href}
                  href={href}
                  style={{ '--pc': color } as CSSProperties}
                  className="relative block min-h-0 whitespace-nowrap text-center !leading-none after:absolute after:inset-x-0 after:-inset-y-4 after:content-[''] text-base font-medium uppercase tracking-[0.15em] sm:text-xl sm:tracking-[0.2em] md:text-2xl text-[color:var(--pc)] underline decoration-[0.06em] underline-offset-[0.3em] transition-colors hover:text-white focus-visible:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>

            <a
              href="#token"
              className="mt-[0.42em] inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-vitae-green px-8 py-3 text-base font-medium uppercase tracking-[0.15em] sm:text-xl sm:tracking-[0.2em] md:text-2xl text-black shadow-neon-sm transition-[box-shadow,transform] duration-200 hover:shadow-neon-md active:scale-[0.97] active:shadow-none sm:w-auto"
            >
              ENTER
            </a>
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
