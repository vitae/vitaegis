import type { Metadata } from 'next';
import PillarDossier from '@/components/PillarDossier';
import { getPillar } from '@/lib/pillars';

const pillar = getPillar('stealth');

export const metadata: Metadata = {
  title: `${pillar.name}: ${pillar.codename} | VITAEGIS`,
  description: pillar.summary,
  openGraph: {
    title: `${pillar.name} | VITAEGIS`,
    description: pillar.doctrine,
    type: 'article',
  },
};

export default function StealthPage() {
  return <PillarDossier pillar={pillar} />;
}
