'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './crypto.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Bitcoin ticker
   The Chainlink BTC/USD price, re-read every minute, with the change over 24H, 7D,
   30D, YTD and 1Y worked out against that live price.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface ReturnRef {
  key: string;
  label: string;
  /** Price at the start of the period; null where the feed has no history. */
  from: number | null;
}

interface Props {
  price: number;
  updatedAt: number;
  returns: ReturnRef[];
}

const POLL_MS = 60_000;

const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;

function ago(sec: number, now: number) {
  const m = Math.max(0, Math.round((now - sec * 1000) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}

export default function BtcLive({ price: initialPrice, updatedAt: initialAt, returns }: Props) {
  const [price, setPrice] = useState(initialPrice);
  const [updatedAt, setUpdatedAt] = useState(initialAt);
  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState<'up' | 'down' | null>(null);
  const last = useRef(initialPrice);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/crypto/btc', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { price?: number; updatedAt?: number };
        if (!alive || typeof json.price !== 'number' || typeof json.updatedAt !== 'number') return;
        if (json.price !== last.current) setTick(json.price > last.current ? 'up' : 'down');
        last.current = json.price;
        setPrice(json.price);
        setUpdatedAt(json.updatedAt);
      } catch {
        /* keep the last price; the next poll will try again */
      } finally {
        if (alive) setNow(Date.now());
      }
    };
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!tick) return;
    const id = window.setTimeout(() => setTick(null), 1200);
    return () => window.clearTimeout(id);
  }, [tick]);

  const day = returns.find((r) => r.key === '24h');
  const dayPct = day?.from ? ((price - day.from) / day.from) * 100 : null;

  return (
    <section aria-labelledby="btc-heading" className={styles.numeric}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="btc-heading" className="text-sm text-vitae-gray">
          Bitcoin <span className="text-vitae-orange">BTC</span> / USD
        </h2>
        <p className="text-xs text-vitae-gray">
          <span
            className={`${styles.pulse} mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-vitae-green align-middle`}
            aria-hidden
          />
          Chainlink · updated {ago(updatedAt, now)}
        </p>
      </div>

      <p
        className={`mt-2 text-5xl font-semibold tracking-tight sm:text-6xl ${styles.price} ${
          tick === 'up' ? 'text-vitae-green' : tick === 'down' ? 'text-vitae-red' : 'text-white'
        }`}
        aria-live="polite"
      >
        {usd(price)}
      </p>
      {dayPct !== null && (
        <p className={`mt-1 text-base ${dayPct >= 0 ? 'text-vitae-green' : 'text-vitae-red'}`}>
          {signed(dayPct)} <span className="text-vitae-gray">past 24 hours</span>
        </p>
      )}

      <dl className="mt-6 grid grid-cols-5 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15">
        {returns.map((r) => {
          const p = r.from ? ((price - r.from) / r.from) * 100 : null;
          return (
            <div key={r.key} className="bg-black px-2 py-3 text-center sm:px-3">
              <dt className="text-xs text-vitae-gray">{r.label}</dt>
              <dd
                className={`mt-1 text-sm font-medium sm:text-base ${
                  p === null ? 'text-vitae-gray' : p >= 0 ? 'text-vitae-green' : 'text-vitae-red'
                }`}
              >
                {p === null ? '—' : signed(p)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
