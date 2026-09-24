import { describe, expect, it } from 'vitest';
import { LOOKBACK_KEYS, referenceFor, type Series } from './stocks-periods';

// Weekday bars at 13:30 UTC from start to end inclusive, close = bar index.
function weekdays(start: string, end: string): Series {
  const series: Series = { times: [], closes: [] };
  for (let d = new Date(`${start}T13:30:00Z`); d <= new Date(`${end}T13:30:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue;
    series.times.push(d.getTime() / 1000);
    series.closes.push(series.closes.length);
  }
  return series;
}

const dateOf = (series: Series, key: Parameters<typeof referenceFor>[1]) => {
  const ref = referenceFor(series, key);
  return ref ? new Date(ref.time * 1000).toISOString().slice(0, 10) : null;
};

describe('referenceFor', () => {
  const series = weekdays('2021-01-04', '2026-09-23'); // ends on a Wednesday

  it('covers every period except YTD', () => {
    expect(LOOKBACK_KEYS).toEqual(['1d', '1w', '1m', '3m', '6m', '1y', '5y']);
  });

  it('uses the previous bar for 1D', () => {
    expect(dateOf(series, '1d')).toBe('2026-09-22');
  });

  it('steps back calendar weeks, months and years', () => {
    expect(dateOf(series, '1w')).toBe('2026-09-16');
    expect(dateOf(series, '1m')).toBe('2026-08-21'); // Aug 23 is a Sunday
    expect(dateOf(series, '3m')).toBe('2026-06-23');
    expect(dateOf(series, '6m')).toBe('2026-03-23');
    expect(dateOf(series, '1y')).toBe('2025-09-23');
    expect(dateOf(series, '5y')).toBe('2021-09-23');
  });

  it('returns the close from that bar', () => {
    const ref = referenceFor(series, '1d');
    expect(ref?.close).toBe(series.closes.length - 2);
  });

  it('clamps month ends instead of rolling over', () => {
    expect(dateOf(weekdays('2026-01-01', '2026-03-31'), '1m')).toBe('2026-02-27'); // Feb 28 is a Saturday
  });

  it('returns null when history is too short', () => {
    const short = weekdays('2026-06-01', '2026-09-23');
    expect(referenceFor(short, '6m')).toBeNull();
    expect(referenceFor(short, '5y')).toBeNull();
    expect(referenceFor({ times: [1], closes: [1] }, '1d')).toBeNull();
  });
});
