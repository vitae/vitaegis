import type { Metadata } from 'next';
import OracleLog from './OracleLog';

export const metadata: Metadata = {
  title: 'Oracle log | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function AdminLogPage() {
  return <OracleLog />;
}
