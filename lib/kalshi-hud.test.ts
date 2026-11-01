import { describe, expect, it } from 'vitest';
import {
  BET_CENTS,
  MAX_BETS_PER_WINDOW,
  currentWindow,
  executionLine,
  executionPnlCents,
  gbmProbability,
  isFresh,
  kellyFraction,
  mergeLines,
  modelMatrix,
  normalCdf,
  normalizeWire,
  performance,
  priceCents,
  probOf,
  realizedVol,
  resultOf,
  sideOf,
  slotGlyphs,
  stakeCents,
  windowLine,
  windowResult,
  windowTracker,
  type MarketWindow,
  type TradeExecution,
} from './kalshi-hud';

const NOW = Date.parse('2026-11-01T05:10:00Z');
/** Kalshi's taker fee for the expectations below. */
const feeFor = (contracts: number, cents: number) =>
  Math.ceil(7 * contracts * (cents / 100) * (1 - cents / 100) - 1e-9);
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
const T = 'KXBTC15M-26NOV010115-15';
let seq = 0;

const exec = (over: Partial<TradeExecution>): TradeExecution => ({
  id: ++seq,
  window_ticker: T,
  action: 'YES',
  price: 0.35,
  size: 28,
  blended_prob: 0.62,
  executed_at: at(60),
  ...over,
});

const win = (over: Partial<MarketWindow>): MarketWindow => ({
  id: ++seq,
  ticker: T,
  strike: 77677.14,
  close_time: at(-300),
  bets_placed: 0,
  status: 'open',
  created_at: at(600),
  ...over,
});

describe('reading the bot values', () => {
  it('reads sides, prices, probabilities and results in either convention', () => {
    expect(sideOf('YES')).toBe('yes');
    expect(sideOf('no')).toBe('no');
    expect(sideOf('buy_yes')).toBe('yes');
    expect(sideOf('BUY NO')).toBe('no');
    expect(sideOf('hold')).toBeNull();
    expect(priceCents(0.35)).toBe(35);
    expect(priceCents(35)).toBe(35);
    expect(probOf(0.62)).toBe(0.62);
    expect(probOf(62)).toBe(0.62);
    expect(resultOf('settled_yes')).toBe('yes');
    expect(resultOf('NO')).toBe('no');
    expect(resultOf('open')).toBeNull();
    expect(stakeCents(exec({}))).toBe(980);
  });

  it('settles P&L from a window result, a row result, or a pnl column', () => {
    const x = exec({});
    expect(executionPnlCents(x, null)).toBeNull();
    expect(executionPnlCents(x, 'yes')).toBe(28 * 65 - feeFor(28, 35));
    expect(executionPnlCents(x, 'no')).toBe(-980 - feeFor(28, 35));
    expect(executionPnlCents(exec({ result: 'yes' }), 'no')).toBe(28 * 65 - feeFor(28, 35));
    expect(executionPnlCents(exec({ pnl: 12.34 }), null)).toBe(1234);
    expect(executionPnlCents(exec({ pnl: -1234 }), null)).toBe(-1234);
    expect(windowResult(win({ status: 'settled_no' }))).toBe('no');
    expect(windowResult(win({ result: 'YES', status: 'closed' }))).toBe('yes');
    expect(windowResult(win({}))).toBeNull();
  });
});

describe('window tracker', () => {
  it('tracks bets against the 2-bet cap', () => {
    const one = windowTracker([exec({}), exec({ window_ticker: 'OTHER' })], T);
    expect(one.placed).toBe(1);
    expect(one.remaining).toBe(1);
    expect(one.locked).toBe(false);
    expect(slotGlyphs(one.slots)).toBe('[● ◯]');
    expect(one.stakeCents).toBe(980);
    expect(one.pnlCents).toBeNull();
    const two = windowTracker([exec({}), exec({ action: 'NO', price: 0.66 })], T, [], 'yes');
    expect(two.placed).toBe(2);
    expect(two.locked).toBe(true);
    expect(slotGlyphs(two.slots)).toBe('[● ●]');
    expect(two.pnlCents).toBe(28 * 65 - feeFor(28, 35) + (-28 * 66 - feeFor(28, 66)));
    expect(slotGlyphs(windowTracker([], null).slots)).toBe('[◯ ◯]');
    expect(MAX_BETS_PER_WINDOW).toBe(2);
  });

  it('never exceeds the cap and trusts the bot count when higher', () => {
    const w = windowTracker([exec({}), exec({}), exec({})], T);
    expect(w.placed).toBe(2);
    expect(w.locked).toBe(true);
    expect(w.executions).toHaveLength(3);
    const reported = windowTracker([], T, [2, null]);
    expect(reported.placed).toBe(2);
    expect(reported.locked).toBe(true);
    expect(windowTracker([exec({})], T, [1]).placed).toBe(1);
  });
});

describe('performance', () => {
  it('sums settled P&L using window results, wins and the last 24 hours', () => {
    const settledYes = win({ ticker: 'A', status: 'settled_yes' });
    const settledNo = win({ ticker: 'B', status: 'settled_no' });
    const p = performance(
      [
        exec({ window_ticker: 'A', executed_at: at(100) }),
        exec({ window_ticker: 'B', executed_at: at(2 * 86_400) }),
        exec({ window_ticker: 'C' }),
      ],
      [settledYes, settledNo, win({ ticker: 'C' })],
      NOW,
    );
    expect(p.trades).toBe(3);
    expect(p.settled).toBe(2);
    expect(p.open).toBe(1);
    expect(p.wins).toBe(1);
    expect(p.winRate).toBe(0.5);
    const won = 28 * 65 - feeFor(28, 35);
    const lost = -980 - feeFor(28, 35);
    expect(p.netCents).toBe(won + lost);
    expect(p.net24hCents).toBe(won);
    expect(p.openStakeCents).toBe(980);
    expect(p.avgEntryCents).toBe(35);
    expect(p.avgBlended).toBeCloseTo(0.62, 6);
    expect(p.equity.map((e) => e.cumCents)).toEqual([lost, lost + won]);
  });
});

describe('models', () => {
  it('prices YES under GBM', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(gbmProbability(100_000, 100_000, 600)).toBeCloseTo(0.5, 2);
    expect(gbmProbability(101_000, 100_000, 60)!).toBeGreaterThan(0.99);
    expect(gbmProbability(99_000, 100_000, 60)!).toBeLessThan(0.01);
    expect(gbmProbability(101_000, 100_000, 0)).toBe(1);
    expect(gbmProbability(101_000, 100_000, 60, 0.6, 'less')!).toBeLessThan(0.01);
    expect(gbmProbability(null, 100_000, 60)).toBeNull();
  });

  it('estimates realized vol from spot history', () => {
    expect(realizedVol([])).toBeNull();
    const hist = Array.from({ length: 120 }, (_, i) => ({
      t: i * 1000,
      p: 100_000 * (1 + (i % 2 ? 0.0002 : -0.0002)),
    }));
    const sigma = realizedVol(hist);
    expect(sigma).not.toBeNull();
    expect(sigma!).toBeGreaterThanOrEqual(0.25);
    expect(sigma!).toBeLessThanOrEqual(2.5);
  });

  it('prefers the bot blend, then the 40/60 mix, then GBM; sizes with Kelly', () => {
    expect(kellyFraction(0.5, 20)).toBeCloseTo(0.375, 6);
    expect(kellyFraction(0.1, 20)).toBe(0);
    const bot = modelMatrix({ gbm: 0.5, ml: null, blended: 0.65, yesAsk: 60, noAsk: 42 });
    expect(bot.source).toBe('bot');
    expect(bot.composite).toBe(0.65);
    expect(bot.market).toBeCloseTo(0.59, 6);
    expect(bot.side).toBe('yes');
    expect(bot.edgeCents!).toBeGreaterThan(0);
    expect(bot.kellyStakeCents).toBe(Math.round(kellyFraction(0.65, 60) * BET_CENTS));
    const blend = modelMatrix({ gbm: 0.5, ml: 0.75, yesAsk: 60, noAsk: 42 });
    expect(blend.source).toBe('blend');
    expect(blend.composite).toBeCloseTo(0.65, 6);
    const solo = modelMatrix({ gbm: 0.3, yesAsk: 60, noAsk: 42, sigma: 0.8 });
    expect(solo.source).toBe('gbm');
    expect(solo.sigmaSource).toBe('realized');
    expect(solo.side).toBe('no');
    expect(modelMatrix({ gbm: 0.5, yesAsk: 50, noAsk: 50 }).side).toBeNull();
    expect(modelMatrix({ gbm: null, yesAsk: 50, noAsk: 50 }).source).toBe('none');
  });
});

describe('terminal lines and status', () => {
  it('formats executions and windows', () => {
    const x = executionLine(exec({}), 'yes', 1);
    expect(x.level).toBe('ok');
    expect(x.text).toBe('BET 1/2 BUY YES 26NOV010115-15 28×35¢ stake $9.80 p=62.0% → WON +$17.75');
    expect(executionLine(exec({}), 'no').level).toBe('warn');
    expect(executionLine(exec({ action: 'NO', price: 66 }), null).text).toContain('BUY NO');
    expect(windowLine(win({ bets_placed: 1 })).text).toBe(
      'window 26NOV010115-15 open strike $77,677.14 1/2 bets',
    );
    expect(windowLine(win({ status: 'settled_yes' })).text).toContain('settled YES');
  });

  it('merges lines by id in time order and caps them', () => {
    const a = { id: 'a', at: at(30), level: 'info' as const, text: 'a' };
    const b = { id: 'b', at: at(10), level: 'info' as const, text: 'b' };
    expect(mergeLines([b], [a, { ...b, text: 'b2' }], 2).map((l) => l.text)).toEqual(['a', 'b2']);
    expect(
      mergeLines([a, b], [{ id: 'c', at: at(0), level: 'ok', text: 'c' }], 2).map((l) => l.id),
    ).toEqual(['b', 'c']);
  });

  it('normalizes the bot status wire format', () => {
    const n = normalizeWire({
      live: true,
      kalshi_ws: 'active',
      ticker: 'T',
      bets_in_window: 1,
      logs: [{ ts: at(1), level: 'WARN', msg: 'slow fill' }],
    });
    expect(n.kalshiWs).toBe(true);
    expect(n.betsInWindow).toBe(1);
    expect(n.logs[0].level).toBe('warn');
    expect(n.logs[0].text).toBe('vps slow fill');
    expect(normalizeWire({ kalshi_ws: false }).kalshiWs).toBe(false);
    expect(normalizeWire({}).kalshiWs).toBeNull();
  });

  it('picks the current window and judges freshness', () => {
    const open = win({ ticker: 'B', close_time: at(-200) });
    const later = win({ ticker: 'C', close_time: at(-1100) });
    const past = win({ ticker: 'A', close_time: at(100), status: 'closed' });
    expect(currentWindow([later, past, open], null, NOW)?.ticker).toBe('B');
    expect(currentWindow([later, past, open], 'C', NOW)?.ticker).toBe('C');
    expect(currentWindow([past], null, NOW)).toBeNull();
    expect(isFresh(at(5), NOW)).toBe(true);
    expect(isFresh(at(500), NOW)).toBe(false);
    expect(isFresh(null, NOW)).toBe(false);
  });
});
