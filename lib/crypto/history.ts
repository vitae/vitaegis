// Server-only. Bitcoin daily closes, kept in Supabase (btc_daily) once read from Chainlink.
// A past close never changes, so each day is searched for exactly once; after the first
// backfill a refresh only has to find yesterday. Without Supabase it still works, just by
// searching every day each time.

import { supabaseAdmin } from '../supabase';
import { btcPricesAt, type Latest } from './chainlink';

const DAY = 86_400;

/** The close of a UTC date is the feed's price at 23:59:59 that day. */
export const closeTime = (day: string) => Date.parse(`${day}T00:00:00Z`) / 1000 + DAY - 1;

/**
 * Closes for the given dates (YYYY-MM-DD, all before today UTC). Dates the feed has no
 * history for are left out of the map.
 */
export async function dailyCloses(days: string[], latest: Latest): Promise<Map<string, number>> {
  const closes = new Map<string, number>();
  const db = supabaseAdmin();

  if (db && days.length) {
    const sorted = [...days].sort();
    // Recent days are one range; anything older (the year-end closes) is asked for by name.
    const cut = sorted[Math.max(0, sorted.length - 600)];
    const [recent, older] = await Promise.all([
      db.from('btc_daily').select('day, close').gte('day', cut).limit(1000),
      db
        .from('btc_daily')
        .select('day, close')
        .in(
          'day',
          sorted.filter((d) => d < cut),
        ),
    ]);
    for (const r of [...(recent.data ?? []), ...(older.data ?? [])] as {
      day: string;
      close: number;
    }[])
      closes.set(r.day, Number(r.close));
  }

  const missing = days.filter((d) => !closes.has(d));
  if (!missing.length) return closes;

  const points = await btcPricesAt(missing.map(closeTime), latest);
  const rows: { day: string; close: number; phase: number; round: number; round_at: string }[] = [];
  missing.forEach((day, i) => {
    const p = points[i];
    if (!p) return;
    closes.set(day, p.answer);
    rows.push({
      day,
      close: p.answer,
      phase: p.phase,
      round: p.round,
      round_at: new Date(p.updatedAt * 1000).toISOString(),
    });
  });

  if (db && rows.length) {
    const { error } = await db.from('btc_daily').upsert(rows, { onConflict: 'day' });
    if (error) console.warn('btc_daily save failed:', error.message);
  }
  return closes;
}
