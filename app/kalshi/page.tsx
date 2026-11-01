import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import KalshiHud from './KalshiHud';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-hud',
  display: 'swap',
});

const DESCRIPTION =
  'The Vitaegis Kalshi trading HUD, live: the 15-minute Bitcoin window the Rust bot is on, BTC spot against the strike, GBM and XGBoost probabilities, the 2-bet window tracker, every execution and the bot log.';

export const metadata: Metadata = {
  title: 'Kalshi HUD | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'Kalshi HUD | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

export default function KalshiPage() {
  return (
    <div className={mono.variable}>
      <KalshiHud />
    </div>
  );
}
