'use client';

// A Bitcoin Lightning donation window pinned to the lower right of the page, above the
// site's bottom nav: the QR opens the
// address in any Lightning wallet (Strike included), the address is printed under it in
// Bitcoin orange, and the label says what it is. Renders nothing until
// NEXT_PUBLIC_LIGHTNING_ADDRESS is set.

import { useMemo, useState } from 'react';
import { BITCOIN_ORANGE, lightningAddress, lightningUri, qrMatrix, qrPath } from '@/lib/lightning';

export default function LightningTip({
  address = lightningAddress(),
}: {
  address?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const uri = address ? lightningUri(address) : null;
  const qr = useMemo(() => (uri ? qrMatrix(uri) : null), [uri]);
  if (!address || !uri || !qr) return null;

  const side = 128;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link still opens the wallet */
    }
  };

  return (
    <aside
      aria-label="Bitcoin Lightning tips"
      className="glass-panel fixed bottom-24 right-4 z-40 flex w-[11.5rem] flex-col items-center rounded-2xl p-3 text-center sm:right-6"
      style={{ borderColor: `${BITCOIN_ORANGE}66` }}
    >
      <a href={uri} aria-label={`Pay ${address} over Bitcoin Lightning`} className="block">
        <svg
          viewBox={`0 0 ${side + 16} ${side + 16}`}
          width={side + 16}
          height={side + 16}
          className="rounded-lg"
          role="img"
          aria-hidden
        >
          <rect width={side + 16} height={side + 16} rx="10" fill="#fff" />
          <path transform="translate(8 8)" d={qrPath(qr, side)} fill="#000" />
        </svg>
      </a>
      <p
        className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: BITCOIN_ORANGE }}
      >
        ₿ Bitcoin Lightning
      </p>
      <button
        type="button"
        onClick={copy}
        title="Copy the Lightning address"
        className="mt-1 max-w-full break-all font-mono text-xs leading-snug hover:underline"
        style={{ color: BITCOIN_ORANGE }}
      >
        {copied ? 'Copied' : address}
      </button>
    </aside>
  );
}
