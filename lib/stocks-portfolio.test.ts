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

// $10,000 in four parts: AAA one at $100 (25 shares) and BBB three at $50 (150 shares). On
// Nov 26 a tenth of the capital comes out of BBB at $60 and buys CCC, not held until then, at $40.
const trimmed: PaperPortfolio = {
  key: 'trimmed',
  opened: '2026-11-24',
  capital: 10_000,
  positions: [
    { ticker: 'AAA', chart: 'X:AAA', parts: 1, entry: 100 },
    { ticker: 'BBB', chart: 'X:BBB', parts: 3, entry: 50 },
    { ticker: 'CCC', chart: 'X:CCC', parts: 0, entry: 40 },
  ],
  trims: [
    {
      date: '2026-11-26',
      time: '13:26',
      from: 'BBB',
      fromPrice: 60,
      share: 0.1,
      into: 'CCC',
      price: 40,
    },
  ],
};

describe('a trim', () => {
  it('sells part of a position at the recorded price and buys another with it', () => {
    const state = trackPortfolio(trimmed, {});
    expect(state.closed).toHaveLength(1);
    const [sale] = state.closed;
    expect(sale).toMatchObject({
      ticker: 'BBB',
      partial: true,
      date: '2026-11-26',
      afterClose: false,
      entry: 50,
      price: 60,
      into: 'CCC',
      intoPrice: 40,
      intoNew: true,
    });
    // $1,000 at $60 is 16.67 shares, which cost $50 each.
    expect(sale.proceeds).toBeCloseTo(1_000);
    expect(sale.shares).toBeCloseTo(16.6667, 4);
    expect(sale.cost).toBeCloseTo(833.33);
    expect(sale.pnl).toBeCloseTo(166.67);
    expect(sale.pnlPct).toBeCloseTo(20);
    expect(sale.bought).toBeCloseTo(25);
    const [aaa, bbb, ccc] = state.positions;
    expect(aaa.shares).toBe(25);
    expect(bbb.shares).toBeCloseTo(133.3333, 4);
    expect(bbb.cost).toBeCloseTo(6_666.67);
    expect(bbb.weight).toBeCloseTo(0.6667, 4);
    expect(bbb.entry).toBe(50);
    expect(ccc.shares).toBeCloseTo(25);
    expect(ccc.cost).toBeCloseTo(1_000);
    expect(ccc.weight).toBeCloseTo(0.1);
    expect(ccc.entry).toBeCloseTo(40);
    // No close yet: BBB is worth what the trim sold it at. 25 × 100 + 133.33 × 60 + 25 × 40
    expect(state.value).toBeCloseTo(11_500);
    // Everything paid for what is held, less what the sale made, is the capital.
    const held = state.positions.reduce((sum, p) => sum + p.cost, 0);
    expect(held - sale.pnl).toBeCloseTo(trimmed.capital);
  });

  it('does not count the position it buys on the days before', () => {
    const state = trackPortfolio(trimmed, {
      AAA: [
        { date: '2026-11-25', close: 100 },
        { date: '2026-11-26', close: 110 },
      ],
      BBB: [
        { date: '2026-11-25', close: 50 },
        { date: '2026-11-26', close: 62 },
      ],
      CCC: [
        { date: '2026-11-25', close: 38 },
        { date: '2026-11-26', close: 42 },
      ],
    });
    // Nov 25, before the trim: 25 × 100 + 150 × 50, and no CCC
    expect(state.days[0].value).toBeCloseTo(10_000);
    // Nov 26, after it: 25 × 110 + 133.33 × 62 + 25 × 42
    expect(state.days[1].value).toBeCloseTo(12_066.67);
    const [, bbb, ccc] = state.positions;
    // CCC has no move on a day it was not held; its first is the stock's own, close to close.
    expect(ccc.moves[0]).toBeNull();
    expect(ccc.moves[1]).toBeCloseTo((42 / 38 - 1) * 100);
    expect(ccc.idle).toBe(1);
    expect(bbb.idle).toBe(0);
    expect(ccc.pnl).toBeCloseTo(50);
    expect(ccc.pnlPct).toBeCloseTo(5);
    // Open gains and the realized one add up to the portfolio's.
    const openPnl = state.positions.reduce((sum, p) => sum + p.pnl, 0);
    expect(openPnl + state.closed[0].pnl).toBeCloseTo(state.pnl);
    expect(state.pnl).toBeCloseTo(2_066.67);
  });

  it('keeps the closes as the marks when it came after them', () => {
    const late: PaperPortfolio = {
      ...trimmed,
      trims: [{ ...trimmed.trims![0], afterClose: true }],
    };
    const state = trackPortfolio(late, {
      AAA: [{ date: '2026-11-26', close: 110 }],
      BBB: [{ date: '2026-11-26', close: 62 }],
      CCC: [{ date: '2026-11-26', close: 42 }],
    });
    // The day closed before the trim: 25 × 110 + 150 × 62
    expect(state.days[0].value).toBeCloseTo(12_050);
    const [, bbb, ccc] = state.positions;
    expect(bbb.last).toBe(62);
    expect(ccc.last).toBe(42);
    expect(ccc.entry).toBeCloseTo(40);
    expect(ccc.moves).toEqual([null]);
    // 25 × 110 + 133.33 × 62 + 25 × 42
    expect(state.value).toBeCloseTo(12_066.67);
  });

  it('can buy back a position a switch sold earlier the same evening', () => {
    // CCC, a quarter of the capital at $200, goes at $180 into BBB at $60; forty minutes
    // later 5% of the capital comes out of BBB at $60 and buys CCC again at $190.
    const back: PaperPortfolio = {
      ...switched,
      positions: [...switched.positions, { ticker: 'CCC', chart: 'X:CCC', parts: 0, entry: 190 }],
      switches: [{ ...switched.switches![0], date: '2026-11-25', time: '19:18', afterClose: true }],
      trims: [
        {
          date: '2026-11-25',
          time: '19:59',
          afterClose: true,
          from: 'BBB',
          fromPrice: 60,
          share: 0.05,
          into: 'CCC',
          price: 190,
        },
      ],
    };
    const state = trackPortfolio(back, {
      AAA: [{ date: '2026-11-25', close: 100 }],
      BBB: [{ date: '2026-11-25', close: 50 }],
      CCC: [{ date: '2026-11-25', close: 190 }],
    });
    // Nov 25 closed with the first CCC still held: 25 × 100 + 100 × 50 + 12.5 × 190
    expect(state.days[0].value).toBeCloseTo(9_875);
    expect(state.closed.map((c) => [c.ticker, c.partial, c.intoNew])).toEqual([
      ['CCC', false, false],
      ['BBB', true, true],
    ]);
    const [, bbb, ccc] = state.positions;
    // BBB held 137.5 shares that cost $7,250; $500 of them at $60 is 8.33 shares.
    expect(state.closed[1].entry).toBeCloseTo(52.727, 3);
    expect(bbb.shares).toBeCloseTo(137.5 - 500 / 60);
    expect(bbb.entry).toBeCloseTo(52.727, 3);
    expect(ccc.shares).toBeCloseTo(500 / 190);
    expect(ccc.weight).toBeCloseTo(0.05);
    const held = state.positions.reduce((sum, p) => sum + p.cost, 0);
    const realized = state.closed.reduce((sum, c) => sum + c.pnl, 0);
    expect(held - realized).toBeCloseTo(back.capital);
  });

  it('sells no more than the position holds', () => {
    const all: PaperPortfolio = { ...trimmed, trims: [{ ...trimmed.trims![0], share: 1 }] };
    const state = trackPortfolio(all, {});
    // BBB is 150 shares: $9,000 at $60, not the $10,000 asked for.
    expect(state.closed[0].proceeds).toBeCloseTo(9_000);
    expect(state.closed[0].partial).toBe(false);
    expect(state.positions[1].shares).toBe(0);
    expect(state.positions[2].shares).toBeCloseTo(225);
    expect(state.value).toBeCloseTo(11_500);
  });
});

describe('paper portfolio', () => {
  const sales = (paper.switches ?? []).flatMap((s) => s.sold);
  const total = [...paper.positions, ...sales].reduce((sum, p) => sum + p.parts, 0);
  // Bought with the portfolio, as opposed to by a trim later.
  const opening = paper.positions.filter((p) => p.parts > 0);
  const position = (state: ReturnType<typeof trackPortfolio>, ticker: string) =>
    state.positions.find((p) => p.ticker === ticker)!;

  it('holds only tickers the board fetches, once each', () => {
    const fetched = new Set(stocks.map((s) => s.ticker));
    const held = paper.positions.map((p) => p.ticker);
    const sold = sales.map((sale) => sale.ticker);
    expect([...held, ...sold].filter((t) => !fetched.has(t))).toEqual([]);
    expect(new Set(held).size).toBe(held.length);
    expect(new Set(sold).size).toBe(sold.length);
    // SPCX is the one position sold whole and bought again later.
    expect(held.filter((t) => sold.includes(t))).toEqual(['SPCX']);
    expect([...paperTickers].sort()).toEqual([...new Set([...held, ...sold])].sort());
  });

  it('weights what it bought by the gap between each target and its entry', () => {
    const gaps = opening.map((p) => (p.target ?? 0) / p.entry - 1);
    expect(gaps.every((g) => g > 0)).toBe(true);
    opening.forEach((p, i) => expect(p.parts).toBeCloseTo(gaps[i]));
    // PANW and TSLA were the two smallest, 2.26% of the capital between them.
    const first = paper.switches![0].sold;
    expect(first.map((s) => s.ticker)).toEqual(['PANW', 'TSLA']);
    expect(first.reduce((sum, s) => sum + s.parts, 0) / total).toBeCloseTo(0.0226, 4);
  });

  it('put what PANW, TSLA and SPCX fetched into ASTS and left the rest alone', () => {
    // As it stood before the trim.
    const state = trackPortfolio({ ...paper, trims: [] }, {});
    const proceeds = state.closed.reduce((sum, c) => sum + c.proceeds, 0);
    expect(state.closed.map((c) => c.ticker)).toEqual(['PANW', 'TSLA', 'SPCX']);
    expect(state.closed.map((c) => c.afterClose)).toEqual([false, false, true]);
    expect(state.positions.filter((p) => p.shares > 0)).toHaveLength(9);
    for (const [i, p] of state.positions.entries()) {
      const bought = (paper.capital * paper.positions[i].parts) / total;
      expect(p.cost).toBeCloseTo(p.ticker === 'ASTS' ? bought + proceeds : bought);
      expect(p.shares * p.entry).toBeCloseTo(p.cost);
    }
    // Everything paid for what is still held, less what the sales made or lost, is the capital.
    const paid = state.positions.reduce((sum, p) => sum + p.cost, 0);
    const realized = state.closed.reduce((sum, c) => sum + c.pnl, 0);
    expect(paid - realized).toBeCloseTo(paper.capital);
  });

  it('then moved 5% of the capital from ASTS back into SPCX', () => {
    const before = trackPortfolio({ ...paper, trims: [] }, {});
    const state = trackPortfolio(paper, {});
    const [trim] = paper.trims!;
    const moved = paper.capital * 0.05;
    expect(state.closed.map((c) => c.ticker)).toEqual(['PANW', 'TSLA', 'SPCX', 'ASTS']);
    const sale = state.closed[3];
    expect(sale).toMatchObject({ partial: true, afterClose: true, into: 'SPCX', intoNew: true });
    expect(sale.proceeds).toBeCloseTo(moved);
    expect(state.positions).toHaveLength(10);

    const spcx = position(state, 'SPCX');
    expect(paper.positions.find((p) => p.ticker === 'SPCX')!.entry).toBe(trim.price);
    expect(spcx.cost).toBeCloseTo(moved);
    expect(spcx.weight).toBeCloseTo(0.05);
    expect(spcx.entry).toBeCloseTo(trim.price);
    expect(spcx.shares).toBeCloseTo(moved / trim.price);

    // ASTS gives up the shares that fetched it, at what its shares cost on average.
    const [was, asts] = [position(before, 'ASTS'), position(state, 'ASTS')];
    expect(was.shares - asts.shares).toBeCloseTo(moved / trim.fromPrice);
    expect(asts.entry).toBeCloseTo(was.entry);
    expect(was.cost - asts.cost).toBeCloseTo(sale.cost);
    expect(sale.pnl).toBeCloseTo((moved / trim.fromPrice) * (trim.fromPrice - was.entry));

    for (const p of state.positions.filter((p) => !['ASTS', 'SPCX'].includes(p.ticker))) {
      expect(p.cost).toBeCloseTo(position(before, p.ticker).cost);
      expect(p.shares).toBeCloseTo(position(before, p.ticker).shares);
    }
    const paid = state.positions.reduce((sum, p) => sum + p.cost, 0);
    const realized = state.closed.reduce((sum, c) => sum + c.pnl, 0);
    expect(paid - realized).toBeCloseTo(paper.capital);
  });

  it('marks the SPCX it bought back to the Nov 25 close, a day it does not count for', () => {
    const state = trackPortfolio(paper, { SPCX: [{ date: '2026-11-25', close: 127.44 }] });
    const spcx = position(state, 'SPCX');
    expect(spcx.moves).toEqual([null]);
    expect(spcx.idle).toBe(1);
    expect(spcx.last).toBe(127.44);
    expect(spcx.pnlPct).toBeCloseTo((127.44 / paper.trims![0].price - 1) * 100);
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
