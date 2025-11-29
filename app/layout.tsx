import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import Providers from '@/components/Providers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'VITAEGIS | Health • Stealth • Wealth',
  description:
    'Ancient wisdom meets cyberpunk technology. Transform your practice through Zen, Kundalini Yoga, Tai Chi, and Qi Gong—powered by Web3.',
  keywords: [
    'Vitaegis',
    'Web3',
    'Zen',
    'Kundalini',
    'Tai Chi',
    'Qi Gong',
    'Wellness',
    'Cryptocurrency',
    'DeFi',
  ],
  authors: [{ name: 'Vitaegis' }],
  openGraph: {
    title: 'VITAEGIS | Health • Stealth • Wealth',
    description:
      'Ancient wisdom meets cyberpunk technology. Transform your practice through Web3.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VITAEGIS | Health • Stealth • Wealth',
    description:
      'Ancient wisdom meets cyberpunk technology. Transform your practice through Web3.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className="antialiased text-white overflow-x-hidden selection:bg-vitae-green selection:text-black"
        style={{ fontFamily: "'Century Gothic', 'Avant Garde', sans-serif" }}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
