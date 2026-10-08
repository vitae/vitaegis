import type { Metadata } from 'next';
import AgentConsole from './AgentConsole';

export const metadata: Metadata = {
  title: 'Agent | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function AgentPage() {
  return <AgentConsole />;
}
