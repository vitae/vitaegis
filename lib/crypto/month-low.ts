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
  const expected = close.round - open.round + 1;
  const points = await btcRounds(close.phase, open.round, close.round);
  // A gap could hide the real low, and the answer is cached: refuse a partial read so the
  // next render tries again instead of keeping a wrong number.
  if (points.length !== expected)
    throw new Error(`June low: read ${points.length} of ${expected} rounds`);
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
export const monthLow = unstable_cache(readMonthLow, ['btc-month-low-v2'], {
  revalidate: 86_400,
});
