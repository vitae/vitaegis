import { describe, expect, it } from 'vitest';
import { LAST_HALVING, monthlyReturns, regime, sma, trendPerMonth } from './signals';

const ramp = (n: number, start: number, dailyPct: number) =>
  Array.from({ length: n }, (_, i) => start * (1 + dailyPct / 100) ** i);

describe('sma', () => {
  it('is null until the window fills, then averages it', () => {
    expect(sma([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
  });
});

describe('trendPerMonth', () => {
  it('recovers a steady compounded growth rate', () => {
    const t = trendPerMonth(ramp(90, 100, 1))!;
    expect(t).toBeCloseTo((1.01 ** 30 - 1) * 100, 5);
  });
});

describe('regime', () => {
  it('calls a steady climb a bull market', () => {
    const closes = ramp(400, 30_000, 0.3);
    const r = regime(closes, closes[closes.length - 1] * 1.003);
    expect(r.label).toBe('Bull market');
    expect(r.lean).toBe('bull');
    expect(r.signals).toHaveLength(6);
    expect(r.signals.every((s) => s.lean === 'bull')).toBe(true);
  });

  it('calls a steady slide a bear market', () => {
    const closes = ramp(400, 100_000, -0.3);
    const r = regime(closes, closes[closes.length - 1] * 0.997);
    expect(r.label).toBe('Bear market');
    expect(r.score).toBe(-6);
  });

  it('calls a flat market neutral', () => {
    const closes = Array.from({ length: 400 }, (_, i) => 60_000 + (i % 2 ? 300 : -300));
    const r = regime(closes, 60_000);
    expect(r.lean).toBe('neutral');
  });

  it('reports the halving cycle as context', () => {
    const r = regime(ramp(400, 1, 0.1), 2, LAST_HALVING + 400 * 86_400_000);
    expect(r.cycle.daysSinceHalving).toBe(400);
    expect(r.cycle.monthsSinceHalving).toBe(13);
  });
});

describe('monthlyReturns', () => {
  it('compares each month-end close with the one before', () => {
    const m = monthlyReturns([
      { date: '2026-01-30', close: 90 },
      { date: '2026-01-31', close: 100 },
      { date: '2026-02-28', close: 110 },
      { date: '2026-03-15', close: 99 },
    ]);
    expect(m.map((x) => x.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(m[0].pct).toBeNull();
    expect(m[1].pct).toBeCloseTo(10);
    expect(m[2].pct).toBeCloseTo(-10);
  });
});
