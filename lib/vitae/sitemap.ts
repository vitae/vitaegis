import { pillars } from '@/lib/pillars';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · site map
   Every page Vitae may describe or open. The allowlist for open_page is built from
   this list plus the pillar "related" links, so adding a page here is enough.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface SitePage {
  path: string;
  title: string;
  blurb: string;
}

export const SITE_MAP: SitePage[] = [
  { path: '/', title: 'Home', blurb: 'The Center for Inner Peace. Health, Stealth, Wealth.' },
  {
    path: '/#about',
    title: 'About',
    blurb: 'What Vitaegis is: Advanced Intelligence as a Service.',
  },
  {
    path: '/#practices',
    title: 'Live',
    blurb: 'The live stream and the three pillars at a glance.',
  },
  { path: '/#projects', title: 'Projects', blurb: 'Three featured projects.' },
  {
    path: '/#token',
    title: 'Store',
    blurb: 'Matcha, The Art of Zen, Yoga for Life, Tai Chi Flow. All $9.99.',
  },
  { path: '/#community', title: 'Connect', blurb: 'Social links and the newsletter.' },
  {
    path: '/health',
    title: 'Health field manual',
    blurb: 'Pillar I. Sleep, movement, breath, food, the daily protocol.',
  },
  {
    path: '/stealth',
    title: 'Stealth field manual',
    blurb: 'Pillar II. Privacy, security, self-defense, the hardening checklist.',
  },
  {
    path: '/wealth',
    title: 'Wealth field manual',
    blurb: 'Pillar III. Bitcoin, investing, business, the order of operations.',
  },
  {
    path: '/books',
    title: 'The Canon',
    blurb: 'The ten books behind Vitaegis, with a free Self-Reliance PDF.',
  },
  { path: '/projects', title: 'All projects', blurb: 'Guides, tools and experiments.' },
  {
    path: '/secrets',
    title: 'Secrets',
    blurb: 'The protocols behind everything we build. $9.99 once, one year of access.',
  },
  {
    path: '/proverbs',
    title: 'Proverbs and the Oracle',
    blurb: 'Zen, Stoic, Taoist and Kundalini wisdom. Ask the Oracle.',
  },
  { path: '/vitae', title: 'Vitae', blurb: 'Talk to Vitae.' },
];

/** Paths open_page may navigate to: the site map plus every pillar's related pages. */
export function allowedPaths(): Set<string> {
  const set = new Set(SITE_MAP.map((p) => p.path));
  for (const pillar of pillars) for (const r of pillar.related) set.add(r.href);
  return set;
}
