import type { Metadata } from 'next';
import ProverbsArchive from './ProverbsArchive';

export const metadata: Metadata = {
  title: 'Proverbs | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function AdminProverbsPage() {
  return <ProverbsArchive />;
}
