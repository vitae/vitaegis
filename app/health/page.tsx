import type { Metadata } from 'next';
import PillarDossier from '@/components/PillarDossier';
import { getPillar } from '@/lib/pillars';

const pillar = getPillar('health');

export const metadata: Metadata = {
  title: `${pillar.name}: ${pillar.codename} | VITAEGIS`,
  description: pillar.summary,
  openGraph: {
    title: `${pillar.name} | VITAEGIS`,
    description: pillar.doctrine,
    type: 'article',
  },
};

export default function HealthPage() {
  return <PillarDossier pillar={pillar} />;
}
