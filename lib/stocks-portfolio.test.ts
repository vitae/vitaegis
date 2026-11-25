import { describe, expect, it } from 'vitest';
import { paper, stocks, type PaperPortfolio } from '@/app/stocks/data';
import { trackPortfolio } from './stocks-portfolio';

// $10,000: a quarter in AAA at $100 (25 shares), three quarters in BBB at $50 (150 shares).
const book: PaperPortfolio = {
  opened: '2026-11-24',
  capital: 10_000,
  positions: [
    { ticker: 'AAA', chart: 'X:AAA', parts: 1, entry: 100 },
    { ticker: 'BBB', chart: 'X:BBB', parts: 3, entry: 50 },
  ],
};

describe('trackPortfolio', () => {
  it('opens flat at the entry closes', () => {
    const state = trackPortfolio(book, {});
    expect(state.value).toBe(10_000);
    expect(state.pnl).toBe(0);
    expect(state.days).toEqual([]);
    expect(state.positions.map((p) => p.weight)).toEqual([0.25, 0.75]);
    expect(state.positions.map((p) => p.shares)).toEqual([25, 150]);
    expect(state.positions.map((p) => p.last)).toEqual([100, 50]);
  });

  it('ignores closes on or before the entry date', () => {
    const state = trackPortfolio(book, {
      AAA: [
        { date: '2026-11-23', close: 500 },
        { date: '2026-11-24', close: 400 },
      ],
    });
    expect(state.days).toEqual([]);
    expect(state.value).toBe(10_000);
  });

  it('marks each day to its close', () => {
    const state = trackPortfolio(book, {
      AAA: [
        { date: '2026-11-25', close: 110 },
        { date: '2026-11-27', close: 99 },
      ],
      BBB: [
        { date: '2026-11-25', close: 45 },
        { date: '2026-11-27', close: 54 },
      ],
    });
    expect(state.days.map((d) => d.date)).toEqual(['2026-11-25', '2026-11-27']);
    // 25 × 110 + 150 × 45 = 9,500, then 25 × 99 + 150 × 54 = 10,575.
    expect(state.days[0].value).toBeCloseTo(9_500);
    expect(state.days[0].change).toBeCloseTo(-500);
    expect(state.days[0].changePct).toBeCloseTo(-5);
    expect(state.days[1].value).toBeCloseTo(10_575);
    expect(state.days[1].change).toBeCloseTo(1_075);
    expect(state.days[1].changePct).toBeCloseTo((1_075 / 9_500) * 100);
    expect(state.days[1].totalPct).toBeCloseTo(5.75);
    expect(state.value).toBeCloseTo(10_575);
    expect(state.pnl).toBeCloseTo(575);
    const [aaa, bbb] = state.positions;
    expect(aaa.moves[0]).toBeCloseTo(10);
    expect(aaa.moves[1]).toBeCloseTo(-10);
    expect(aaa.pnlPct).toBeCloseTo(-1);
    expect(bbb.moves[0]).toBeCloseTo(-10);
    expect(bbb.moves[1]).toBeCloseTo(20);
    expect(bbb.pnl).toBeCloseTo(600);
  });

  it('carries the previous close through a day without a bar', () => {
    const state = trackPortfolio(book, {
      AAA: [{ date: '2026-11-25', close: 110 }],
      BBB: [
        { date: '2026-11-25', close: 50 },
        { date: '2026-11-27', close: 60 },
      ],
    });
    expect(state.positions[0].moves[0]).toBeCloseTo(10);
    expect(state.positions[0].moves[1]).toBeNull();
    // 25 × 110 + 150 × 60
    expect(state.days[1].value).toBeCloseTo(11_750);
  });
});

describe('paper portfolio', () => {
  it('holds only tickers the board fetches, once each', () => {
    const fetched = new Set(stocks.map((s) => s.ticker));
    const held = paper.positions.map((p) => p.ticker);
    expect(held.filter((t) => !fetched.has(t))).toEqual([]);
    expect(new Set(held).size).toBe(held.length);
  });

  it('lists its weights as percentages of the capital', () => {
    const state = trackPortfolio(paper, {});
    const listed = paper.positions.reduce((sum, p) => sum + p.parts, 0);
    expect(paper.positions.every((p) => p.parts > 0)).toBe(true);
    expect(Math.abs(listed - 100)).toBeLessThan(0.1);
    state.positions.forEach((p, i) =>
      expect(p.weight * 100).toBeCloseTo(paper.positions[i].parts, 1),
    );
  });

  it('spends exactly the capital', () => {
    const state = trackPortfolio(paper, {});
    expect(state.positions.reduce((sum, p) => sum + p.weight, 0)).toBeCloseTo(1);
    expect(state.positions.reduce((sum, p) => sum + p.cost, 0)).toBeCloseTo(paper.capital);
    for (const p of state.positions) {
      expect(p.shares * p.entry).toBeCloseTo(p.cost);
    }
  });
});
