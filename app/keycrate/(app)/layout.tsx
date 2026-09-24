import type { ReactNode } from 'react';
import { KeyCrateProvider } from '../_state/store';

// The builder and Set Study share one client-side store; the public share page does not need it.
export default function KeyCrateAppLayout({ children }: { children: ReactNode }) {
  return <KeyCrateProvider>{children}</KeyCrateProvider>;
}
