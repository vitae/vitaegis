import type { ReactNode } from 'react';
import AccessGate from '../_components/AccessGate';
import { NowPlaying } from '../_components/Audio';
import { AudioProvider } from '../_state/audio';
import { KeyCrateProvider } from '../_state/store';

// The builder and Set Study share one client-side store and sit behind the paywall (off until
// KEYCRATE_STRIPE_PRICE_ID is set); the public share page needs neither.
export default function KeyCrateAppLayout({ children }: { children: ReactNode }) {
  return (
    <KeyCrateProvider>
      <AudioProvider>
        <AccessGate>
          {children}
          <NowPlaying />
        </AccessGate>
      </AudioProvider>
    </KeyCrateProvider>
  );
}
