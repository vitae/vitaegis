import type { Metadata } from 'next';
import KalshiBoard from './KalshiBoard';

const DESCRIPTION =
  'The Vitaegis Kalshi bot, live: the 15-minute Bitcoin market it is watching, every trade with its fill, fee, latency and settled profit, and which entry line would have paid best.';

export const metadata: Metadata = {
  title: 'Kalshi bot | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'Kalshi bot | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

export default function KalshiPage() {
  return <KalshiBoard />;
}
