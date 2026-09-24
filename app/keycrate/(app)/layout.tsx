import type { ReactNode } from 'react';
import { NowPlaying } from '../_components/Audio';
import { AudioProvider } from '../_state/audio';
import { KeyCrateProvider } from '../_state/store';

// The builder and Set Study share one client-side store; the public share page does not need it.
export default function KeyCrateAppLayout({ children }: { children: ReactNode }) {
  return (
    <KeyCrateProvider>
      <AudioProvider>
        {children}
        <NowPlaying />
      </AudioProvider>
    </KeyCrateProvider>
  );
}
