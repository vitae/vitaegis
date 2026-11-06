import type { Metadata } from 'next';
import KalshiHud from './KalshiHud';

const DESCRIPTION =
  'The Vitaegis Kalshi trading HUD, live: the 15-minute Bitcoin window the Rust bot is on, BTC spot against the strike, GBM and XGBoost probabilities, the 2-bet window tracker, every execution and the bot log.';

export const metadata: Metadata = {
  title: 'Kalshi HUD | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'Kalshi HUD | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

export default function KalshiPage() {
  return (
    <div>
      <KalshiHud />
    </div>
  );
}
