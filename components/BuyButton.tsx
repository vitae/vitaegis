'use client';

import { useState } from 'react';

interface Props {
  /** Catalog id from lib/store.ts; the server looks up the price. */
  productId: string;
  /** Shown on the button, e.g. "$9.99". */
  priceLabel: string;
}

/** Liquid-glass buy button: same surface, rim and glow as every other control on the site. */
export default function BuyButton({ productId, priceLabel }: Props) {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, origin: window.location.origin }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setLoading(false);
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={checkout}
      className="glass-panel glass-panel--hover flex min-h-[52px] w-full items-center justify-center rounded-xl px-8 text-base font-medium tracking-wide text-[#00ff00] transition-colors hover:text-white disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
      style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Redirecting…
          </>
        ) : (
          `Buy · ${priceLabel}`
        )}
      </span>
    </button>
  );
}
