'use client';

import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { socials } from '@/components/socials';
import PillarLinks from '@/components/PillarLinks';
import LightningTip from '@/components/LightningTip';

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
    <footer className="relative pb-6 pt-10 sm:pb-8 sm:pt-14">
      <div className="section-container mx-auto w-full">
        <GlassContainer variant="default" glow padding="lg" className="w-full">
          <div className="grid gap-6 text-center sm:gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)] md:text-left">
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
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                Advanced Intelligence as a Service. <em>Vitae</em> and <em>Aegis</em>: Life Energy.
                Intelligence orchestrated agentically with curated knowledge which constantly
                improves itself. Turning ideas into reality, in real time.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
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
                <ul className="mt-2 space-y-1">
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

          {/* Donation box: Monero, Lightning (Strike) and on-chain Bitcoin rails */}
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-4 border-t border-white/10 pt-5 text-center">
            <LightningTip inline />
            <div className="flex max-w-xs flex-col items-center gap-2 text-center">
              <h4 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ff8000]">
                ⚡ Donate
              </h4>
              <p className="text-sm leading-relaxed text-white/70">
                Monero, Bitcoin over Lightning, or Bitcoin on-chain. Scan the code, or tap the
                address to copy it.
              </p>
              <Link
                href="/donate"
                className="text-xs text-white/50 transition-colors hover:text-[#ff8000]"
              >
                All donation options →
              </Link>
            </div>
          </div>

          <p className="mt-5 whitespace-nowrap border-t border-white/10 pt-4 text-center text-xs text-white/40">
            © 2026 VITAEGIS. All rights reserved.
            <Link href="/privacy" className="ml-4 transition-colors hover:text-white">
              Privacy
            </Link>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </p>
        </GlassContainer>
      </div>
    </footer>
  );
}
