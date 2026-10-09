'use client';

import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { socials } from '@/components/socials';
import PillarLinks from '@/components/PillarLinks';
import CopyButton from '@/components/CopyButton';
import { LIGHTNING_ADDRESS, LIGHTNING_QR, LIGHTNING_URI } from '@/lib/donate';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Footer
   Styled to match the Connect section above it: the same glass pane, the same
   @vitaegis channels, and the same words the About section uses for the brand.
   ═══════════════════════════════════════════════════════════════════════════════ */

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Pillars',
    links: [
      { label: 'Health', href: '/health' },
      { label: 'Stealth', href: '/stealth' },
      { label: 'Wealth', href: '/wealth' },
    ],
  },
  {
    title: 'Projects',
    links: [
      { label: 'Stocks', href: '/stocks' },
      { label: 'Crypto', href: '/crypto' },
      { label: 'Travel', href: '/travel' },
      { label: 'All projects', href: '/projects' },
    ],
  },
  {
    title: 'Vitaegis',
    links: [
      { label: 'About', href: '/#about' },
      { label: 'Live', href: '/#practices' },
      { label: 'Store', href: '/#token' },
      { label: 'Connect', href: '/#community' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative pb-10 pt-2">
      <div className="section-container mx-auto w-full">
        <GlassContainer variant="default" glow className="w-full p-6 sm:p-10">
          <div className="grid gap-10 text-center md:grid-cols-[1.4fr_repeat(3,1fr)] md:text-left">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start">
              <span
                className="font-[Jost] text-2xl font-bold uppercase tracking-[0.18em] text-white"
                style={{ textShadow: '0 0 28px rgba(0,255,0,0.25)' }}
              >
                Vitaegis
              </span>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#00ff00]/80">
                <PillarLinks />
              </p>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                Advanced Intelligence as a Service. <em>Vitae</em> and <em>Aegis</em>: Life Energy,
                run as an intelligence layer. Turning ideas into reality, in real time.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                {socials.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`VITAEGIS on ${social.name}`}
                      className="glass-panel glass-panel--subtle glass-panel--hover flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:text-white"
                    >
                      <Icon size={17} style={{ color: social.color }} />
                    </a>
                  );
                })}
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.title} className="flex flex-col items-center md:items-start">
                <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#00ff00]">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/60 transition-colors hover:text-[#00ff00]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bitcoin donation (Lightning, Strike) */}
          <div className="mt-10 flex flex-col items-center gap-5 border-t border-white/10 pt-8 sm:flex-row sm:justify-center sm:gap-8">
            <a
              href={LIGHTNING_URI}
              aria-label={`Donate bitcoin over Lightning to ${LIGHTNING_ADDRESS}`}
              className="block overflow-hidden rounded-xl"
              style={{ boxShadow: '0 0 28px rgba(247,147,26,0.35)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LIGHTNING_QR}
                alt={`Lightning QR code for ${LIGHTNING_ADDRESS}`}
                width={128}
                height={128}
                loading="lazy"
              />
            </a>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f7931a]">
                ⚡ Donate Bitcoin
              </h4>
              <a
                href={LIGHTNING_URI}
                className="font-mono text-sm text-white/80 transition-colors hover:text-[#f7931a]"
              >
                {LIGHTNING_ADDRESS}
              </a>
              <div className="flex items-center gap-4 text-xs">
                <CopyButton
                  value={LIGHTNING_ADDRESS}
                  className="min-h-0 whitespace-nowrap rounded-full border border-[#f7931a] px-3 py-1 leading-tight text-[#f7931a] transition hover:bg-[#f7931a] hover:text-black"
                />
                <Link
                  href="/donate"
                  className="text-white/50 transition-colors hover:text-[#f7931a]"
                >
                  On-chain &amp; more →
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
            <span>© 2026 VITAEGIS. All rights reserved.</span>
            <div className="flex gap-5">
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </GlassContainer>
      </div>
    </footer>
  );
}
