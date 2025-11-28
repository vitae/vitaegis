import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VITAEGIS | Health • Stealth • Wealth',
  description: 'Ancient wisdom meets cyberpunk technology. Zen, Kundalini Yoga, Tai Chi, Qi Gong - powered by Web3.',
  keywords: ['Vitaegis', 'Web3', 'Zen', 'Kundalini', 'Tai Chi', 'Qi Gong', 'Wellness', 'Cyberpunk'],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Century Gothic is a system font - no external import needed */}
        {/* Fallback fonts are Avant Garde and generic sans-serif */}
      </head>
      <body 
        className="antialiased bg-black text-white overflow-x-hidden"
        style={{ fontFamily: "'Century Gothic', 'Avant Garde', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
