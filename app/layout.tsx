import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'VITAEGIS | Health • Stealth • Wealth',
  description:
    'Ancient wisdom meets Cyberspirituality. Evolve your energy through the convergence of Zen Meditation, Kundalini Yoga, Yang Tai Chi, and Qi Gong.',
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VITAEGIS',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'VITAEGIS | Health • Stealth • Wealth',
    description:
      'Ancient wisdom meets Cyberspirituality. Evolve your energy through the convergence of Zen Meditation, Kundalini Yoga, Yang Tai Chi, and Qi Gong.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VITAEGIS | Health • Stealth • Wealth',
    description:
      'Ancient wisdom meets Cyberspirituality. Evolve your energy through the convergence of Zen Meditation, Kundalini Yoga, Yang Tai Chi, and Qi Gong.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
        {/* Jost font - closest free alternative to Futura */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        {/* iOS PWA settings */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Prevent text size adjustment on orientation change */}
        <meta name="x-ua-compatible" content="IE=edge" />
      </head>
      <body className="antialiased text-white selection:bg-vitae-green selection:text-black font-futura w-full min-h-screen flex flex-col text-center">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
