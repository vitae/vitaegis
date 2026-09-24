import type { Metadata } from 'next';
import SetStudy from '../../_components/SetStudy';

export const metadata: Metadata = {
  title: 'Set Study · KeyCrate | VITAEGIS',
  description: 'Paste a tracklist, match it to your library, and see every transition, the BPM path and the key path on the wheel.',
};

export default function StudyPage() {
  return <SetStudy />;
}
