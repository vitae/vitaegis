'use client';

import { usePathname } from 'next/navigation';
import VitaeConversation from './VitaeConversation';

/** Floating Vitae control on every page but /vitae. Absent unless NEXT_PUBLIC_VITAE_ENABLED=1. */
export default function VitaeOrb() {
  const pathname = usePathname();
  if (process.env.NEXT_PUBLIC_VITAE_ENABLED !== '1' || pathname === '/vitae') return null;
  return (
    <div
      className="fixed right-4 z-50 sm:right-6"
      style={{ bottom: 'calc(var(--nav-bottom) + var(--sab) + 1rem)' }}
    >
      <VitaeConversation size="orb" />
    </div>
  );
}
