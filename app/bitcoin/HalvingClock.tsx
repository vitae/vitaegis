'use client';

import { useEffect, useState } from 'react';
import s from './bitcoin.module.css';

const NEXT_HALVING_BLOCK = 1_050_000;
const BLOCK_MINUTES = 10;

type Tip = { height: number; at: number };

/** Live countdown to block 1,050,000 using the current chain tip from mempool.space. */
export default function HalvingClock() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('https://mempool.space/api/blocks/tip/height', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        const height = Number(await res.text());
        if (!cancelled && Number.isFinite(height)) setTip({ height, at: Date.now() });
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!tip) {
    return (
      <div className={s.stat}>
        <div>
          <b>~Apr 2028</b>
          <span>{failed ? 'estimated halving date' : 'loading live block height…'}</span>
        </div>
        <div>
          <b>1,050,000</b>
          <span>halving block</span>
        </div>
      </div>
    );
  }

  const left = Math.max(0, NEXT_HALVING_BLOCK - tip.height);
  const eta = new Date(tip.at + left * BLOCK_MINUTES * 60 * 1000);
  const days = Math.round((left * BLOCK_MINUTES) / 60 / 24);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={s.stat}>
      <div>
        <b>{fmt.format(eta)}</b>
        <span>estimated halving date</span>
      </div>
      <div>
        <b>{days.toLocaleString('en-US')}</b>
        <span>days to go</span>
      </div>
      <div>
        <b>{left.toLocaleString('en-US')}</b>
        <span>blocks left</span>
      </div>
      <div>
        <b>{tip.height.toLocaleString('en-US')}</b>
        <span>current block</span>
      </div>
    </div>
  );
}
