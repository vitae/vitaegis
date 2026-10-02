// Watch zones for a coin from its daily closes: the price levels traders watch (recent
// range, moving averages, yearly extremes), which one is nearest above and below, and
// whether the price is pressing on one right now. Pure, so the rules are testable.

import { sma } from './signals';

export type LevelKind = 'support' | 'resistance';

export interface Level {
  label: string;
  price: number;
  kind: LevelKind;
}

export type ZoneStatus =
  | 'breakout'
  | 'breakdown'
  | 'testing-resistance'
  | 'testing-support'
  | 'mid-range';

export interface Zones {
  levels: Level[];
  support: (Level & { distance: number }) | null;
  resistance: (Level & { distance: number }) | null;
  status: ZoneStatus;
  headline: string;
  /** 0 at the 30-day low, 1 at the 30-day high. */
  rangePosition: number | null;
  trend: 'up' | 'down' | 'mixed';
  ma50: number | null;
  ma200: number | null;
}

/** Within this % of a level counts as testing it. */
export const NEAR_PCT = 3;

const fmt = (n: number) =>
  n >= 100
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : n >= 1
      ? `$${n.toFixed(2)}`
      : `$${n.toPrecision(3)}`;

/**
 * @param closes daily closes, oldest first (a year is ideal; 30 is the minimum)
 * @param price  the live price
 */
export function watchZones(closes: number[], price: number): Zones {
  const last30 = closes.slice(-30);
  const year = closes.slice(-365);
  const hi30 = Math.max(...last30);
  const lo30 = Math.min(...last30);
  const ma50 = closes.length >= 50 ? sma(closes, 50).at(-1)! : null;
  const ma200 = closes.length >= 200 ? sma(closes, 200).at(-1)! : null;

  const levels: Level[] = [
    { label: '30-day high', price: hi30, kind: 'resistance' },
    { label: '30-day low', price: lo30, kind: 'support' },
    { label: '1-year high', price: Math.max(...year), kind: 'resistance' },
    { label: '1-year low', price: Math.min(...year), kind: 'support' },
  ];
  // An average is support while the price is above it and resistance once below.
  if (ma50)
    levels.push({
      label: '50-day average',
      price: ma50,
      kind: price >= ma50 ? 'support' : 'resistance',
    });
  if (ma200)
    levels.push({
      label: '200-day average',
      price: ma200,
      kind: price >= ma200 ? 'support' : 'resistance',
    });

  const dist = (l: Level) => ((l.price - price) / price) * 100;
  const above = levels.filter((l) => l.price > price).sort((a, b) => a.price - b.price);
  const below = levels.filter((l) => l.price < price).sort((a, b) => b.price - a.price);
  const resistance = above[0]
    ? { ...above[0], kind: 'resistance' as const, distance: dist(above[0]) }
    : null;
  const support = below[0]
    ? { ...below[0], kind: 'support' as const, distance: dist(below[0]) }
    : null;

  let status: ZoneStatus = 'mid-range';
  let headline: string;
  if (price >= hi30) {
    status = 'breakout';
    headline = `Breaking out above its 30-day high of ${fmt(hi30)}.`;
  } else if (price <= lo30) {
    status = 'breakdown';
    headline = `Breaking down below its 30-day low of ${fmt(lo30)}.`;
  } else if (
    resistance &&
    resistance.distance <= NEAR_PCT &&
    (!support || resistance.distance <= -support.distance)
  ) {
    status = 'testing-resistance';
    headline = `Pressing on the ${resistance.label} at ${fmt(resistance.price)}, ${resistance.distance.toFixed(1)}% above.`;
  } else if (support && -support.distance <= NEAR_PCT) {
    status = 'testing-support';
    headline = `Sitting on the ${support.label} at ${fmt(support.price)}, ${(-support.distance).toFixed(1)}% below.`;
  } else {
    headline = `Between ${support ? `${support.label} ${fmt(support.price)}` : 'its lows'} and ${
      resistance ? `${resistance.label} ${fmt(resistance.price)}` : 'its highs'
    }.`;
  }

  const trend: Zones['trend'] =
    ma50 && ma200
      ? price > ma50 && ma50 > ma200
        ? 'up'
        : price < ma50 && ma50 < ma200
          ? 'down'
          : 'mixed'
      : 'mixed';

  return {
    levels,
    support,
    resistance,
    status,
    headline,
    rangePosition: hi30 > lo30 ? (price - lo30) / (hi30 - lo30) : null,
    trend,
    ma50,
    ma200,
  };
}
