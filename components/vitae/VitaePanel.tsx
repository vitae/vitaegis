'use client';

import dynamic from 'next/dynamic';

/* The full-size control on /vitae. The conversation (and the WebRTC stack behind it) is
   fetched only in the browser, only on this page. */
const VitaeConversation = dynamic(() => import('./VitaeConversation'), {
  ssr: false,
  loading: () => (
    <p className="text-xs uppercase tracking-[0.3em] text-[#00ff00]/60">Loading Vitae…</p>
  ),
});

export default function VitaePanel() {
  return <VitaeConversation size="page" />;
}
