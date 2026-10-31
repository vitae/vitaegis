import type { Metadata } from 'next';
import KalshiDesk from './KalshiDesk';

export const metadata: Metadata = {
  title: 'Kalshi bot | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function AdminKalshiPage() {
  return <KalshiDesk />;
}
