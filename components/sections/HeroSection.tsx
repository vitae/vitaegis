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

const TEXT =
  '!leading-none text-base font-medium uppercase tracking-[0.15em] sm:text-xl sm:tracking-[0.2em] md:text-2xl';

/** Share of the logo's width that the VITAEGIS letters cover, so the box lines up with them. */
const LOGO_INK = 0.7733;

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
          padding="none"
          className="hero-in w-full sm:w-[calc(min(92vw,720px)*var(--logo-ink))]"
          style={{ '--d': '400ms', '--logo-ink': LOGO_INK } as CSSProperties}
        >
          <div className="flex w-full flex-col gap-5 p-6 sm:gap-6 sm:p-10 md:p-12">
            <p
              className={`${TEXT} text-center text-vitae-green sm:-mr-[0.2em] sm:flex sm:justify-between`}
            >
              <span>Center</span> <span>for</span> <span>Inner</span> <span>Peace</span>
            </p>

            <div className="grid w-full grid-cols-3 items-center text-base sm:-mr-[0.2em] sm:flex sm:w-auto sm:justify-between sm:text-xl md:text-2xl">
              {PILLARS.map(([href, label, color]) => (
                <Link
                  key={href}
                  href={href}
                  style={{ '--pc': color } as CSSProperties}
                  className={`${TEXT} relative block min-h-0 whitespace-nowrap text-center text-[color:var(--pc)] transition-colors after:absolute after:inset-x-0 after:-inset-y-4 after:content-[''] hover:text-white focus-visible:text-white`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <a
              href="#token"
              className={`${TEXT} mt-[0.05em] inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-vitae-green px-8 py-3 text-black shadow-neon-sm transition-[box-shadow,transform] duration-200 hover:shadow-neon-md active:scale-[0.97] active:shadow-none`}
            >
              ENTER
            </a>
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
