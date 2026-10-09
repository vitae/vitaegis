'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

/* The ElevenLabs SDK carries the WebRTC stack; fetch it only when the orb actually renders. */
const VitaeConversation = dynamic(() => import('./VitaeConversation'), { ssr: false });

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
