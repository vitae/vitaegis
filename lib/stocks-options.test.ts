import { describe, expect, it } from 'vitest';
import {
  buildPlay,
  MIN_WINDOWS,
  nextMonthly,
  optionPnl,
  pickOption,
  rollingReturns,
  shareBeyond,
  sharesPnl,
  thirdFriday,
  weekdaysBetween,
  type Chain,
} from './stocks-options';

const quote = (ask: number | null, last: number | null = null) => ({ bid: null, ask, last });

// Shares at $100. Puts and calls every $5 from $85 to $115.
const chain: Chain = {
  expiry: '2026-12-18',
  last: 100,
  asOf: null,
  rows: [
    { strike: 85, call: quote(15.5), put: quote(0.5) },
    { strike: 90, call: quote(11), put: quote(1) },
    { strike: 95, call: quote(7), put: quote(2) },
    { strike: 100, call: quote(4), put: quote(4) },
    { strike: 105, call: quote(2), put: quote(7) },
    { strike: 110, call: quote(1), put: quote(null, 10.5) },
    { strike: 115, call: quote(null), put: quote(null) },
  ],
};

describe('expiry dates', () => {
  it('finds the third Friday', () => {
    expect(thirdFriday(2026, 11)).toBe('2026-12-18');
    expect(thirdFriday(2027, 0)).toBe('2027-01-15');
    // A month that starts on a Friday.
    expect(thirdFriday(2027, 0 + 9)).toBe('2027-10-15');
  });

  it('skips a monthly expiry that is too close', () => {
    expect(nextMonthly('2026-11-25')).toBe('2026-12-18');
    expect(nextMonthly('2026-12-04')).toBe('2026-12-18');
    expect(nextMonthly('2026-12-05')).toBe('2027-01-15');
    expect(nextMonthly('2026-12-18')).toBe('2027-01-15');
  });

  it('counts weekdays up to and including the expiry', () => {
    expect(weekdaysBetween('2026-11-25', '2026-12-18')).toBe(17);
    expect(weekdaysBetween('2026-12-18', '2026-12-21')).toBe(1);
    expect(weekdaysBetween('2026-12-18', '2026-12-18')).toBe(0);
  });
});

describe('history', () => {
  it('measures every return over the same number of closes', () => {
    const returns = rollingReturns([100, 110, 121, 60.5], 2);
    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(0.21);
    expect(returns[1]).toBeCloseTo(-0.45);
    expect(rollingReturns([100, 110], 2)).toEqual([]);
    expect(rollingReturns([100, 110], 0)).toEqual([]);
  });

  it('counts moves at least as large, on the side asked for', () => {
    const returns = [-0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3];
    expect(shareBeyond(returns, -0.1)).toBe(0.25);
    expect(shareBeyond(returns, 0.1)).toBe(0.375);
    expect(shareBeyond(returns, 0.02, true)).toBe(0.5);
    expect(shareBeyond([], -0.1)).toBe(0);
  });
});

describe('pickOption', () => {
  it('takes the strike nearest the price moved out of the money', () => {
    expect(pickOption(chain, 'put', 0)).toEqual({ strike: 100, cost: 4 });
    expect(pickOption(chain, 'put', 0.05)).toEqual({ strike: 95, cost: 2 });
    expect(pickOption(chain, 'put', 0.1)).toEqual({ strike: 90, cost: 1 });
    expect(pickOption(chain, 'call', 0.05)).toEqual({ strike: 105, cost: 2 });
    expect(pickOption(chain, 'call', 0.1)).toEqual({ strike: 110, cost: 1 });
  });

  it('uses the last trade when nothing is offered, and skips a strike with no quote', () => {
    expect(pickOption({ ...chain, last: 110 }, 'put', 0)).toEqual({ strike: 110, cost: 10.5 });
    expect(pickOption({ ...chain, last: 116 }, 'call', 0)).toEqual({ strike: 110, cost: 1 });
    expect(pickOption({ ...chain, rows: [] }, 'put', 0)).toBeNull();
  });
});

describe('buildPlay', () => {
  // Alternating +12% and -12% days: over one close, half the periods rise 12% and half fall 12%.
  const closes = [100];
  for (let i = 1; i <= MIN_WINDOWS + 1; i++) {
    closes.push(closes[i - 1] * (i % 2 ? 1.12 : 0.88));
  }

  it('prices the breakeven and the straddle off the share price', () => {
    const play = buildPlay('AAA', chain, closes, 1);
    expect(play.last).toBe(100);
    // $4 put + $4 call at the $100 strike.
    expect(play.priced).toBeCloseTo(8);
    expect(play.puts.map((p) => p?.strike)).toEqual([100, 95, 90]);
    expect(play.calls.map((c) => c?.strike)).toEqual([100, 105, 110]);
    // The $95 put costs $2, so it is worth its cost at $93.
    expect(play.puts[1]?.needs).toBeCloseTo(-7);
    expect(play.calls[1]?.needs).toBeCloseTo(7);
  });

  it('counts how often the stock went that far before', () => {
    const play = buildPlay('AAA', chain, closes, 1);
    expect(play.windows).toBe(MIN_WINDOWS + 1);
    expect(play.happened?.[-10]).toBeCloseTo(0.5, 1);
    expect(play.happened?.[-20]).toBe(0);
    expect(play.happened?.[5]).toBeCloseTo(0.5, 1);
    expect(play.happened?.[20]).toBe(0);
    // The $95 put needs -7%: every down day got there and no up day did.
    expect(play.puts[1]?.paidBefore).toBeCloseTo(0.5, 1);
    // The $85 put costs $0.50, so it needs -15.5%: more than any day gave.
    const deep = buildPlay('AAA', { ...chain, rows: chain.rows.slice(0, 1) }, closes, 1);
    expect(deep.puts[0]?.needs).toBeCloseTo(-15.5);
    expect(deep.puts[0]?.paidBefore).toBe(0);
  });

  it('leaves history blank when there is too little of it', () => {
    const play = buildPlay('NEW', chain, closes.slice(0, 10), 1);
    expect(play.happened).toBeNull();
    expect(play.puts[0]?.paidBefore).toBeNull();
    expect(play.puts[0]?.strike).toBe(100);
  });

  it('still answers without an option chain', () => {
    const play = buildPlay('AAA', null, closes, 1);
    expect(play.last).toBeCloseTo(closes[closes.length - 1]);
    expect(play.priced).toBeNull();
    expect(play.puts).toEqual([null, null, null]);
    expect(play.happened?.[-10]).toBeCloseTo(0.5, 1);
    expect(buildPlay('AAA', null, [], 17).last).toBeNull();
  });
});

describe('payoff at the expiry', () => {
  const put = { strike: 95, cost: 2 };
  const call = { strike: 105, cost: 2 };

  it('pays a put what the shares finish under its strike, less its cost', () => {
    expect(optionPnl('put', put, 100, -10)).toBeCloseTo(300);
    expect(optionPnl('put', put, 100, -7)).toBeCloseTo(0);
    expect(optionPnl('put', put, 100, -5)).toBeCloseTo(-200);
    expect(optionPnl('put', put, 100, 20)).toBeCloseTo(-200);
  });

  it('pays a call what the shares finish over its strike, less its cost', () => {
    expect(optionPnl('call', call, 100, 10)).toBeCloseTo(300);
    expect(optionPnl('call', call, 100, 5)).toBeCloseTo(-200);
  });

  it('pays 100 shares the move itself, short or long', () => {
    expect(sharesPnl(100, -10)).toBeCloseTo(1_000);
    expect(sharesPnl(100, 10)).toBeCloseTo(1_000);
  });
});
