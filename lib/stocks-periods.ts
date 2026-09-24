import type { PeriodKey } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks lookback periods
   Given one ticker's daily closes, find the close each period compares against:
   the last close on or before (latest bar − period). 1D is simply the previous
   bar. YTD uses `closeOnOrBefore` with the Dec 31, 2025 date.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface Series {
  /** Unix seconds, ascending. */
  times: number[];
  /** Close for each entry in `times`. */
  closes: number[];
}

export interface Reference {
  close: number;
  /** Unix seconds of the bar the close came from. */
  time: number;
}

type LookbackKey = Exclude<PeriodKey, 'ytd'>;

/** Calendar offset for each period, applied in UTC to the latest bar's time. */
const OFFSETS: Record<Exclude<LookbackKey, '1d'>, { days?: number; months?: number }> = {
  '1w': { days: 7 },
  '1m': { months: 1 },
  '3m': { months: 3 },
  '6m': { months: 6 },
  '1y': { months: 12 },
  '5y': { months: 60 },
};

export const LOOKBACK_KEYS = ['1d', ...Object.keys(OFFSETS)] as LookbackKey[];

function target(latest: number, key: Exclude<LookbackKey, '1d'>): number {
  const d = new Date(latest * 1000);
  const { days = 0, months = 0 } = OFFSETS[key];
  if (days) d.setUTCDate(d.getUTCDate() - days);
  if (months) {
    // Clamp to the month's last day so e.g. Mar 31 − 1 month is Feb 28, not Mar 3.
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - months);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  return Math.floor(d.getTime() / 1000);
}

/** Last bar at or before `t` (Unix seconds), skipping the latest bar. Null if there is none. */
export function closeOnOrBefore(series: Series, t: number): Reference | null {
  for (let i = series.times.length - 2; i >= 0; i--) {
    if (series.times[i] <= t) return { close: series.closes[i], time: series.times[i] };
  }
  return null;
}

/** Close to compare the latest bar against, or null when history does not reach back far enough. */
export function referenceFor(series: Series, key: LookbackKey): Reference | null {
  const n = series.times.length;
  if (n < 2) return null;
  if (key === '1d') return { close: series.closes[n - 2], time: series.times[n - 2] };
  return closeOnOrBefore(series, target(series.times[n - 1], key));
}
