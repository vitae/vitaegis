// Server-only. Bitcoin's lowest Chainlink price inside one calendar month (UTC).
// Reads every round the feed wrote that month (about 1,100 for June 2026), so the low is
// the oracle's actual bottom, not a daily close. A finished month never changes, so the
// answer is cached for good.

import { unstable_cache } from 'next/cache';
import { btcPricesAt, btcRounds } from './chainlink';

export interface MonthLow {
  /** YYYY-MM */
  month: string;
  price: number;
  /** Unix seconds the low was written. */
  at: number;
  rounds: number;
}

async function readMonthLow(year: number, month: number): Promise<MonthLow | null> {
  const start = Date.UTC(year, month - 1, 1) / 1000;
  const end = Date.UTC(year, month, 1) / 1000;
  const [open, close] = await btcPricesAt([start, end - 1]);
  if (!open || !close || open.phase !== close.phase) return null;
  // `open` is the round in force at 00:00 on the 1st; its price held into the month.
  const points = await btcRounds(close.phase, open.round, close.round);
  if (!points.length) return null;
  let low = points[0];
  for (const p of points) if (p.answer < low.answer) low = p;
  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    price: low.answer,
    at: Math.max(low.updatedAt, start),
    rounds: points.length,
  };
}

/** Cached forever once the month is over; a month still running is re-read daily. */
export const monthLow = unstable_cache(readMonthLow, ['btc-month-low-v1'], {
  revalidate: 86_400,
});
