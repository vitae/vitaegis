import { describe, expect, it } from 'vitest';
import { paper, papers, stocks, type PaperPortfolio } from '@/app/stocks/data';
import { deskKey, trackPortfolio, withLive } from './stocks-portfolio';

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

  it('weights each position by the gap between its target and its entry', () => {
    const state = trackPortfolio(paper, {});
    const gaps = paper.positions.map((p) => (p.target ?? 0) / p.entry - 1);
    const total = gaps.reduce((sum, g) => sum + g, 0);
    expect(gaps.every((g) => g > 0)).toBe(true);
    state.positions.forEach((p, i) => expect(p.weight).toBeCloseTo(gaps[i] / total));
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

describe('paper portfolio sizes', () => {
  it('names each size', () => {
    expect(papers.map((p) => deskKey(p.capital))).toEqual(['10k', '5k', '1k']);
    expect(deskKey(750)).toBe('750');
    expect(deskKey(2_500)).toBe('2500');
  });

  it('holds the same positions at the same weights and entries in every size', () => {
    const history = { NVDA: [{ date: '2026-11-25', close: 141.81 }] };
    const [big, ...rest] = papers.map((p) => trackPortfolio(p, history));
    expect(big.pnl).toBeLessThan(0);
    for (const state of rest) {
      const scale = state.capital / big.capital;
      expect(state.pnlPct).toBeCloseTo(big.pnlPct);
      expect(state.pnl).toBeCloseTo(big.pnl * scale);
      expect(state.days[0].change).toBeCloseTo(big.days[0].change * scale);
      state.positions.forEach((p, i) => {
        expect(p.weight).toBeCloseTo(big.positions[i].weight);
        expect(p.entry).toBe(big.positions[i].entry);
        expect(p.shares).toBeCloseTo(big.positions[i].shares * scale);
      });
    }
  });
});

describe('withLive', () => {
  const history = { AAA: [{ date: '2026-11-25', close: 110 }] };

  it('marks a day whose close is not published yet', () => {
    const live = withLive(
      history,
      { AAA: { date: '2026-11-27', price: 120 }, BBB: { date: '2026-11-27', price: 40 } },
      book.opened,
    );
    expect(live.date).toBe('2026-11-27');
    const state = trackPortfolio(book, live.history);
    expect(state.days.map((d) => d.date)).toEqual(['2026-11-25', '2026-11-27']);
    // 25 × 120 + 150 × 40
    expect(state.value).toBeCloseTo(9_000);
    expect(state.positions.map((p) => p.last)).toEqual([120, 40]);
    expect(state.positions[1].pnl).toBeCloseTo(-1_500);
    expect(history.AAA).toHaveLength(1);
  });

  it('leaves a day alone once its close is in', () => {
    const live = withLive(history, { AAA: { date: '2026-11-25', price: 999 } }, book.opened);
    expect(live.date).toBeNull();
    expect(live.history.AAA).toEqual(history.AAA);
  });

  it('ignores prices from the entry day or before, and prices that are not prices', () => {
    const live = withLive(
      {},
      {
        AAA: { date: '2026-11-24', price: 130 },
        BBB: { date: '2026-11-25', price: 0 },
      },
      book.opened,
    );
    expect(live.date).toBeNull();
    expect(trackPortfolio(book, live.history).days).toEqual([]);
  });
});
