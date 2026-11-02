import type { Metadata } from 'next';
import Board from './Board';

const DESCRIPTION =
  'The Vitaegis Rust bot on Kalshi’s 15-minute Bitcoin markets, live: its model against the market, every fee-gated trade, and P&L after fees.';

export const metadata: Metadata = {
  title: 'KALSHIRUST | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'KALSHIRUST | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

export default function KalshirustPage() {
  return <Board />;
}
