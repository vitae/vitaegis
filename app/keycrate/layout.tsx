import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import type { ReactNode } from 'react';
import './keycrate.css';

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--kc-font',
});

const description =
  'Harmonic playlist builder for a rekordbox library: browse by Camelot key and BPM, tap tracks into a set, and get in-key suggestions for the next one.';

export const metadata: Metadata = {
  title: 'KeyCrate | VITAEGIS',
  description,
  openGraph: { title: 'KeyCrate | VITAEGIS', description, type: 'website' },
  twitter: { card: 'summary_large_image', title: 'KeyCrate | VITAEGIS', description },
};

export default function KeyCrateLayout({ children }: { children: ReactNode }) {
  return (
    // Like /run and /travel: the page scrolls inside its own full-viewport container.
    <main
      id="kc-scroll"
      className={`${jost.variable} kc-root fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-black text-left text-white`}
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="nav-clear relative min-h-full">{children}</div>
    </main>
  );
}
