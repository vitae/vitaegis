import type { IconType } from 'react-icons';
import {
  HiClock,
  HiGlobeAlt,
  HiLightningBolt,
  HiBeaker,
  HiSparkles,
  HiAcademicCap,
  HiHeart,
  HiTrendingUp,
} from 'react-icons/hi';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Projects
   Single source of truth for the standalone pages surfaced under /projects
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface Project {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: IconType;
}

export const projects: Project[] = [
  {
    href: '/happy-hour',
    label: 'HAPPY HOUR',
    title: 'Happy Hour Hawaiʻi',
    description:
      'The finest food-first happy hours of Honolulu & Waikiki, ranked — every plate, pour and address.',
    icon: HiClock,
  },
  {
    href: '/travel',
    label: 'TRAVEL',
    title: 'Flight Radar',
    description:
      'Six sectors out of Honolulu, ranked nearest to farthest. Pick a sector to light its routes.',
    icon: HiGlobeAlt,
  },
  {
    href: '/run',
    label: 'RUN',
    title: 'Run · Diamond Head',
    description:
      'Six running routes from Kaimana Beach, shortest to longest, with the marathon course for December.',
    icon: HiLightningBolt,
  },
  {
    href: '/stocks',
    label: 'STOCKS',
    title: 'Wealth Board',
    description: 'Twelve tickers versus their Dec 31, 2025 close, refreshed hourly.',
    icon: HiTrendingUp,
  },
  {
    href: '/vitamins',
    label: 'VITAMINS',
    title: 'Daily Stack',
    description: 'Seven supplements, what each one is for, and when to take it.',
    icon: HiBeaker,
  },
  {
    href: '/proverbs',
    label: 'PROVERBS',
    title: 'Proverbs & Oracle',
    description: 'A living archive of Zen, Stoic, Taoist and Kundalini wisdom — ask the Oracle.',
    icon: HiSparkles,
  },
  {
    href: '/classes',
    label: 'CLASSES',
    title: 'Meditation Mondays',
    description: 'Sunset sessions every Monday. Ancient wisdom meets modern science.',
    icon: HiAcademicCap,
  },
  {
    href: '/movement',
    label: 'MOVEMENT',
    title: 'Support the Movement',
    description: 'Back the Center for Inner Peace and keep the practice alive.',
    icon: HiHeart,
  },
];
