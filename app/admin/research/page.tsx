import type { Metadata } from 'next';
import ResearchDesk from './ResearchDesk';

export const metadata: Metadata = {
  title: 'Research desk | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function ResearchPage() {
  return <ResearchDesk />;
}
