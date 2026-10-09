'use client';

// The donation window pinned to the lower right of the page, above the site's bottom nav.
// One rail at a time, Monero on the left, then Bitcoin over Lightning (Strike), then Bitcoin
// on-chain. Each shows a QR that opens the payment in a wallet, the label saying what it is,
// and the address, in Bitcoin orange for Bitcoin and Monero orange for XMR. Tap the address
// to copy it. Addresses live in lib/donate.ts; a rail with no address is not shown.

import { useMemo, useState } from 'react';
import { donationRails, qrMatrix, qrPath, shortAddress, type RailId } from '@/lib/lightning';

const RAILS = donationRails();

export default function LightningTip({ inline = false }: { inline?: boolean }) {
  // inline: sits in the page flow (the footer donate block) instead of pinned lower right.
  const [active, setActive] = useState<RailId>(RAILS[0]?.id ?? 'lightning');
  const [copied, setCopied] = useState(false);
  const rail = RAILS.find((r) => r.id === active) ?? RAILS[0];
  const qr = useMemo(() => (rail ? qrMatrix(rail.uri) : null), [rail]);
  if (!rail || !qr) return null;

  const side = 124;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rail.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link still opens the wallet */
    }
  };

  return (
    // The outer box is the fixed anchor; .glass-panel sets position: relative, so it lives
    // on the inner box instead of fighting Tailwind's fixed.
    <aside
      aria-label="Donate"
      className={inline ? 'w-[13.5rem]' : 'fixed bottom-24 right-4 z-40 w-[13.5rem] sm:right-6'}
      style={inline ? undefined : { position: 'fixed' }}
    >
      <div
        className="glass-panel flex flex-col items-center rounded-2xl p-2.5 text-center"
        style={{ borderColor: `${rail.color}66` }}
      >
        {RAILS.length > 1 && (
          <div className="mb-2 flex w-full gap-1" role="tablist" aria-label="Donation rails">
            {RAILS.map((r) => {
              const on = r.id === rail.id;
              return (
                <button
                  key={r.id}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => {
                    setActive(r.id);
                    setCopied(false);
                  }}
                  className="flex-1 rounded-full border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition"
                  style={{
                    color: on ? '#000' : r.color,
                    background: on ? r.color : 'transparent',
                    borderColor: `${r.color}66`,
                  }}
                >
                  {r.tab}
                </button>
              );
            })}
          </div>
        )}
        <a href={rail.uri} aria-label={`Pay ${rail.address}: ${rail.label}`} className="block">
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
          className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: rail.color }}
        >
          {rail.label}
        </p>
        <button
          type="button"
          onClick={copy}
          title={`Copy ${rail.address}`}
          className="mt-0.5 max-w-full break-all font-mono text-[11px] leading-snug hover:underline"
          style={{ color: rail.color }}
        >
          {copied ? 'Copied' : rail.id === 'lightning' ? rail.address : shortAddress(rail.address)}
        </button>
      </div>
    </aside>
  );
}
