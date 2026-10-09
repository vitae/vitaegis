'use client';

import { useState } from 'react';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/token';

/** Starts Stripe Checkout for one-time access and sends the visitor there. */
export default function UnlockButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/secrets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout');
      window.location.assign(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={unlock}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-vitae-green/40 bg-vitae-green/10 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green hover:text-black disabled:opacity-60"
        style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
      >
        {busy ? 'Opening checkout…' : `Unlock for ${SECRETS_PRICE_LABEL}`}
      </button>
      <p className="text-xs text-white/40">
        One-time payment. One year of access. Secure checkout by Stripe.
      </p>
      {error && <p className="text-xs text-vitae-red">{error}</p>}
    </div>
  );
}
