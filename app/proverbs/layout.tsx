import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proverbs | VITAEGIS',
  description: 'Ask the Proverbs oracle, or browse the library of collected wisdom.',
};

export default function ProverbsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
