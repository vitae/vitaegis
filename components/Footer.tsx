'use client';

import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { socials } from '@/components/socials';
import PillarLinks from '@/components/PillarLinks';

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

          <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
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
