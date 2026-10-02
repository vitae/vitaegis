// Trend read for Bitcoin from daily closes. Pure, so the scoring is testable.
// This is a description of the current trend from well-known rules of thumb, not a
// forecast: every one of these signals has given false readings before.

export interface DailyClose {
  /** YYYY-MM-DD (UTC) */
  date: string;
  close: number;
}

export type Lean = 'bull' | 'bear' | 'neutral';

export interface Signal {
  name: string;
  value: string;
  lean: Lean;
  detail: string;
}

export interface Regime {
  score: number;
  max: number;
  label: string;
  lean: Lean;
  outlook: string;
  signals: Signal[];
  mayer: number | null;
  /** Context only, never scored. */
  cycle: { daysSinceHalving: number; monthsSinceHalving: number; note: string };
}

/** Simple moving average; null until there are n values. */
export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  });
  return out;
}

export const pct = (from: number | null | undefined, to: number | null | undefined) =>
  from && to ? ((to - from) / from) * 100 : null;

/** Least-squares slope of ln(price) per day, as a compounded % per 30 days. */
export function trendPerMonth(values: number[]): number | null {
  const n = values.length;
  if (n < 10) return null;
  const ys = values.map((v) => Math.log(v));
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return (Math.exp((num / den) * 30) - 1) * 100;
}

const fmtPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;
const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The 2024 halving; the next is expected around April 2028. */
export const LAST_HALVING = Date.UTC(2024, 3, 20);

/**
 * Score six trend signals +1 (bullish), −1 (bearish) or 0 and label the sum.
 * `closes` are daily closes, oldest first; `price` is the live price.
 */
export function regime(closes: number[], price: number, now = Date.now()): Regime {
  const signals: Signal[] = [];
  const at = (arr: (number | null)[], back = 0) => arr[arr.length - 1 - back] ?? null;
  const series = [...closes, price];
  const ma50 = sma(series, 50);
  const ma200 = sma(series, 200);
  const m50 = at(ma50);
  const m200 = at(ma200);

  if (m200) {
    signals.push({
      name: 'Price vs 200-day average',
      value: `${fmtPct(pct(m200, price)!)} vs ${fmtUsd(m200)}`,
      lean: price > m200 ? 'bull' : 'bear',
      detail:
        price > m200
          ? 'Above the long-term average, where bull markets live.'
          : 'Below the long-term average, where bear markets live.',
    });
  }
  if (m50 && m200) {
    signals.push({
      name: '50-day vs 200-day',
      value: m50 > m200 ? 'Golden cross' : 'Death cross',
      lean: m50 > m200 ? 'bull' : 'bear',
      detail:
        m50 > m200
          ? 'The short-term average sits above the long-term one.'
          : 'The short-term average sits below the long-term one.',
    });
  }
  const m200Past = at(ma200, 30);
  if (m200 && m200Past) {
    const slope = pct(m200Past, m200)!;
    signals.push({
      name: '200-day average, last 30 days',
      value: `${fmtPct(slope)}`,
      lean: slope > 0.5 ? 'bull' : slope < -0.5 ? 'bear' : 'neutral',
      detail: 'Whether the long-term trend line itself is rising or rolling over.',
    });
  }
  const p30 = series.length > 30 ? pct(series[series.length - 31], price) : null;
  if (p30 !== null) {
    signals.push({
      name: '30-day momentum',
      value: fmtPct(p30),
      lean: p30 > 3 ? 'bull' : p30 < -3 ? 'bear' : 'neutral',
      detail: 'Change over the last month.',
    });
  }
  const t90 = trendPerMonth(series.slice(-90));
  if (t90 !== null) {
    signals.push({
      name: '90-day trend line',
      value: `${fmtPct(t90)} / month`,
      lean: t90 > 2 ? 'bull' : t90 < -2 ? 'bear' : 'neutral',
      detail: 'The best-fit line through the last 90 days, smoothing out the noise.',
    });
  }
  const high = Math.max(...series.slice(-365));
  const dd = pct(high, price)!;
  signals.push({
    name: 'Off the 1-year high',
    value: `${fmtPct(dd)} from ${fmtUsd(high)}`,
    lean: dd > -10 ? 'bull' : dd < -25 ? 'bear' : 'neutral',
    detail: 'Within 10% of the high is strength; more than 25% below is a bear-market drawdown.',
  });

  const score = signals.reduce(
    (s, x) => s + (x.lean === 'bull' ? 1 : x.lean === 'bear' ? -1 : 0),
    0,
  );
  const max = signals.length;
  const strong = Math.ceil(max * 0.6);
  const label =
    score >= strong
      ? 'Bull market'
      : score >= 2
        ? 'Leaning bull'
        : score <= -strong
          ? 'Bear market'
          : score <= -2
            ? 'Leaning bear'
            : 'Neutral / chop';
  const lean: Lean = score >= 2 ? 'bull' : score <= -2 ? 'bear' : 'neutral';
  const outlook =
    lean === 'bull'
      ? 'Trend points up. Most signals agree; a break back below the 200-day average would flip it.'
      : lean === 'bear'
        ? 'Trend points down. Most signals agree; reclaiming the 200-day average would be the first sign of a turn.'
        : 'No clear trend. Signals disagree, so expect chop until the price picks a side of the 200-day average.';

  const days = Math.floor((now - LAST_HALVING) / 86_400_000);
  const months = Math.floor(days / 30.44);
  const cycleNote =
    months < 12
      ? 'Early in the cycle. Past cycles ran hardest 12 to 18 months after a halving.'
      : months <= 18
        ? 'In the window where past cycles peaked, 12 to 18 months after a halving.'
        : months <= 30
          ? 'Past the window where past cycles peaked. Previous cycles spent this stretch in a bear market.'
          : 'Late in the cycle. Past cycles bottomed and began recovering ahead of the next halving.';

  return {
    score,
    max,
    label,
    lean,
    outlook,
    signals,
    mayer: m200 ? price / m200 : null,
    cycle: { daysSinceHalving: days, monthsSinceHalving: months, note: cycleNote },
  };
}

/** Month-by-month returns from daily closes: each month's last close vs the month before. */
export function monthlyReturns(
  daily: DailyClose[],
): { month: string; close: number; pct: number | null }[] {
  const ends = new Map<string, number>();
  for (const d of daily) ends.set(d.date.slice(0, 7), d.close); // later days overwrite
  const months = [...ends.entries()];
  return months.map(([month, close], i) => ({
    month,
    close,
    pct: i > 0 ? pct(months[i - 1][1], close) : null,
  }));
}
