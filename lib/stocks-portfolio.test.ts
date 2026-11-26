import { describe, expect, it } from 'vitest';
import {
  astsOnly,
  paper,
  paperLevels,
  papers,
  paperTickers,
  stocks,
  type PaperPortfolio,
} from '@/app/stocks/data';
import { trackPortfolio, withLive } from './stocks-portfolio';

// $10,000: a quarter in AAA at $100 (25 shares), three quarters in BBB at $50 (150 shares).
const book: PaperPortfolio = {
  key: 'book',
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

// $10,000 in four parts: AAA one at $100 (25 shares), BBB two at $50 (100 shares) and CCC one
// at $200 (12.5 shares). On Nov 26 CCC is sold at $180 and the $2,250 buys BBB at $60.
const switched: PaperPortfolio = {
  key: 'switched',
  opened: '2026-11-24',
  capital: 10_000,
  positions: [
    { ticker: 'AAA', chart: 'X:AAA', parts: 1, entry: 100 },
    { ticker: 'BBB', chart: 'X:BBB', parts: 2, entry: 50 },
  ],
  switches: [
    {
      date: '2026-11-26',
      time: '13:26',
      sold: [{ ticker: 'CCC', parts: 1, entry: 200, price: 180 }],
      into: 'BBB',
      price: 60,
    },
  ],
};

describe('a switch', () => {
  it('sells at the recorded price and puts the proceeds into the position named', () => {
    const state = trackPortfolio(switched, {});
    expect(state.closed).toHaveLength(1);
    expect(state.closed[0]).toMatchObject({
      ticker: 'CCC',
      date: '2026-11-26',
      cost: 2_500,
      shares: 12.5,
      proceeds: 2_250,
      pnl: -250,
      into: 'BBB',
      bought: 37.5,
      intoPrice: 60,
    });
    expect(state.closed[0].pnlPct).toBeCloseTo(-10);
    const [aaa, bbb] = state.positions;
    expect(aaa.shares).toBe(25);
    expect(aaa.entry).toBe(100);
    expect(bbb.shares).toBeCloseTo(137.5);
    expect(bbb.cost).toBeCloseTo(7_250);
    expect(bbb.weight).toBeCloseTo(0.725);
    // $7,250 paid for 137.5 shares.
    expect(bbb.entry).toBeCloseTo(52.727, 3);
    // No close yet: BBB is worth what the switch paid for it. 25 × 100 + 137.5 × 60
    expect(state.value).toBeCloseTo(10_750);
    expect(state.days).toEqual([]);
  });

  it('counts the sold position on the days before the sale and not after', () => {
    const state = trackPortfolio(switched, {
      AAA: [
        { date: '2026-11-25', close: 100 },
        { date: '2026-11-26', close: 110 },
      ],
      BBB: [
        { date: '2026-11-25', close: 50 },
        { date: '2026-11-26', close: 62 },
      ],
      CCC: [
        { date: '2026-11-25', close: 190 },
        { date: '2026-11-26', close: 500 },
      ],
    });
    // Nov 25, still holding CCC: 25 × 100 + 100 × 50 + 12.5 × 190
    expect(state.days[0].value).toBeCloseTo(9_875);
    // Nov 26, after the switch: 25 × 110 + 137.5 × 62
    expect(state.days[1].value).toBeCloseTo(11_275);
    expect(state.value).toBeCloseTo(11_275);
    expect(state.pnl).toBeCloseTo(1_275);
    // The day's move is the stock's own, from close to close.
    expect(state.positions[1].moves).toEqual([0, 24]);
    // The position's gain is on everything paid for it: 8,525 against 7,250.
    expect(state.positions[1].pnl).toBeCloseTo(1_275);
    expect(state.positions[1].pnlPct).toBeCloseTo(17.586, 3);
    // Open gains and the realized loss add up to the portfolio's: 250 + 1,275 - 250.
    const openPnl = state.positions.reduce((sum, p) => sum + p.pnl, 0);
    expect(openPnl + state.closed[0].pnl).toBeCloseTo(state.pnl);
  });

  it('applies a switch made after the newest close', () => {
    const state = trackPortfolio(switched, {
      AAA: [{ date: '2026-11-25', close: 100 }],
      BBB: [{ date: '2026-11-25', close: 55 }],
      CCC: [{ date: '2026-11-25', close: 190 }],
    });
    expect(state.days).toHaveLength(1);
    expect(state.days[0].value).toBeCloseTo(10_375);
    expect(state.closed).toHaveLength(1);
    // 25 × 100 + 137.5 × 60, the price the switch paid
    expect(state.value).toBeCloseTo(10_750);
  });

  it('leaves the day alone when the switch came after its close', () => {
    const late: PaperPortfolio = {
      ...switched,
      switches: [{ ...switched.switches![0], afterClose: true }],
    };
    const state = trackPortfolio(late, {
      AAA: [
        { date: '2026-11-25', close: 100 },
        { date: '2026-11-26', close: 110 },
        { date: '2026-11-27', close: 110 },
      ],
      BBB: [
        { date: '2026-11-25', close: 50 },
        { date: '2026-11-26', close: 62 },
        { date: '2026-11-27', close: 62 },
      ],
      CCC: [
        { date: '2026-11-25', close: 190 },
        { date: '2026-11-26', close: 500 },
        { date: '2026-11-27', close: 900 },
      ],
    });
    // Nov 26 still holds CCC at its close: 25 × 110 + 100 × 62 + 12.5 × 500
    expect(state.days[1].value).toBeCloseTo(15_200);
    // Nov 27 is after the switch: 25 × 110 + 137.5 × 62
    expect(state.days[2].value).toBeCloseTo(11_275);
    expect(state.closed[0].afterClose).toBe(true);
  });

  it('keeps the close as the mark when the switch came after it', () => {
    const late: PaperPortfolio = {
      ...switched,
      switches: [{ ...switched.switches![0], afterClose: true }],
    };
    const state = trackPortfolio(late, {
      AAA: [{ date: '2026-11-26', close: 110 }],
      BBB: [{ date: '2026-11-26', close: 62 }],
      CCC: [{ date: '2026-11-26', close: 190 }],
    });
    // The day closed still holding CCC: 25 × 110 + 100 × 62 + 12.5 × 190
    expect(state.days[0].value).toBeCloseTo(11_325);
    // Since then CCC went at $180 and bought BBB at $60, but BBB is still marked at its $62
    // close: 25 × 110 + 137.5 × 62
    expect(state.positions[1].last).toBe(62);
    expect(state.value).toBeCloseTo(11_275);
  });

  it('applies a same-day switch made during the session before one made after the close', () => {
    const both: PaperPortfolio = {
      ...switched,
      switches: [
        { date: '2026-11-26', time: '19:00', afterClose: true, sold: [], into: 'AAA', price: 1 },
        switched.switches![0],
      ],
    };
    const state = trackPortfolio(both, {
      AAA: [{ date: '2026-11-26', close: 110 }],
      BBB: [{ date: '2026-11-26', close: 62 }],
      CCC: [{ date: '2026-11-26', close: 500 }],
    });
    // The session switch counts on Nov 26 even though it is listed second.
    expect(state.days[0].value).toBeCloseTo(11_275);
  });
});

describe('paper portfolio', () => {
  const sales = (paper.switches ?? []).flatMap((s) => s.sold);
  const total = [...paper.positions, ...sales].reduce((sum, p) => sum + p.parts, 0);

  it('holds only tickers the board fetches, once each', () => {
    const fetched = new Set(stocks.map((s) => s.ticker));
    const held = paper.positions.map((p) => p.ticker);
    const sold = sales.map((sale) => sale.ticker);
    expect([...held, ...sold].filter((t) => !fetched.has(t))).toEqual([]);
    expect(new Set([...held, ...sold]).size).toBe(held.length + sold.length);
    expect([...paperTickers].sort()).toEqual([...new Set([...held, ...sold])].sort());
  });

  it('weights what it bought by the gap between each target and its entry', () => {
    const gaps = paper.positions.map((p) => (p.target ?? 0) / p.entry - 1);
    expect(gaps.every((g) => g > 0)).toBe(true);
    paper.positions.forEach((p, i) => expect(p.parts).toBeCloseTo(gaps[i]));
    // PANW and TSLA were the two smallest, 2.26% of the capital between them.
    const first = paper.switches![0].sold;
    expect(first.map((s) => s.ticker)).toEqual(['PANW', 'TSLA']);
    expect(first.reduce((sum, s) => sum + s.parts, 0) / total).toBeCloseTo(0.0226, 4);
  });

  it('put what PANW, TSLA and SPCX fetched into ASTS and left the rest alone', () => {
    const state = trackPortfolio(paper, {});
    const proceeds = state.closed.reduce((sum, c) => sum + c.proceeds, 0);
    expect(state.closed.map((c) => c.ticker)).toEqual(['PANW', 'TSLA', 'SPCX']);
    expect(state.closed.map((c) => c.afterClose)).toEqual([false, false, true]);
    expect(state.positions).toHaveLength(9);
    for (const [i, p] of state.positions.entries()) {
      const bought = (paper.capital * paper.positions[i].parts) / total;
      expect(p.cost).toBeCloseTo(p.ticker === 'ASTS' ? bought + proceeds : bought);
      expect(p.shares * p.entry).toBeCloseTo(p.cost);
    }
    // Everything paid for what is still held, less what the sales made or lost, is the capital.
    const held = state.positions.reduce((sum, p) => sum + p.cost, 0);
    const realized = state.closed.reduce((sum, c) => sum + c.pnl, 0);
    expect(held - realized).toBeCloseTo(paper.capital);
  });

  it('still held SPCX at the Nov 25 close', () => {
    const spcx = sales.find((s) => s.ticker === 'SPCX')!;
    const shares = (paper.capital * spcx.parts) / total / spcx.entry;
    const day = (close: number) =>
      trackPortfolio(paper, { SPCX: [{ date: '2026-11-25', close }] }).days[0].value;
    // Its close moves that day's value by its shares, so it was still in the portfolio.
    expect(day(127.44) - day(spcx.entry)).toBeCloseTo(shares * (127.44 - spcx.entry));
  });

  it('keeps a second portfolio wholly in ASTS from the same close', () => {
    const state = trackPortfolio(astsOnly, { ASTS: [{ date: '2026-11-25', close: 25.96 }] });
    expect(astsOnly.opened).toBe(paper.opened);
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].weight).toBe(1);
    expect(state.positions[0].entry).toBe(23.6);
    expect(state.pnlPct).toBeCloseTo(10);
    expect(state.value).toBeCloseTo(11_000);
  });
});

describe('paper portfolio levels', () => {
  it('names each portfolio once and offers three sizes', () => {
    expect(papers.map((p) => p.key)).toEqual(['asts', 'mix']);
    expect(paperLevels).toEqual([10_000, 5_000, 1_000]);
  });

  it('scales the dollars and the shares and nothing else', () => {
    const history = { NVDA: [{ date: '2026-11-25', close: 141.81 }] };
    for (const base of papers) {
      const [big, ...rest] = paperLevels.map((capital) =>
        trackPortfolio({ ...base, capital }, history),
      );
      for (const state of rest) {
        const scale = state.capital / big.capital;
        expect(state.pnlPct).toBeCloseTo(big.pnlPct);
        expect(state.pnl).toBeCloseTo(big.pnl * scale);
        state.positions.forEach((p, i) => {
          expect(p.weight).toBeCloseTo(big.positions[i].weight);
          expect(p.entry).toBeCloseTo(big.positions[i].entry);
          expect(p.shares).toBeCloseTo(big.positions[i].shares * scale);
        });
        state.closed.forEach((c, i) => expect(c.pnl).toBeCloseTo(big.closed[i].pnl * scale));
      }
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
