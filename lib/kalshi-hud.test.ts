import { describe, expect, it } from 'vitest';
import {
  BET_CENTS,
  MAX_BETS_PER_WINDOW,
  currentWindow,
  executionLine,
  gbmProbability,
  isFresh,
  kellyFraction,
  matrixFromSignal,
  mergeLines,
  modelMatrix,
  normalCdf,
  normalizeWire,
  performance,
  realizedVol,
  signalLine,
  slotGlyphs,
  windowLine,
  windowTracker,
  type BotSignal,
  type MarketWindow,
  type TradeExecution,
} from './kalshi-hud';

const NOW = Date.parse('2026-11-01T05:10:00Z');
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
let seq = 0;

const exec = (over: Partial<TradeExecution>): TradeExecution => ({
  id: `x${seq++}`,
  created_at: at(60),
  ticker: 'KXBTC15M-26NOV010115-15',
  window_id: null,
  bet_number: 1,
  side: 'no',
  price_cents: 20,
  count: 50,
  fill_count: 50,
  avg_fill_cents: 20,
  fee_cents: 56,
  stake_cents: null,
  latency_ms: 42,
  order_id: null,
  client_order_id: null,
  status: 'filled',
  result: null,
  pnl_cents: null,
  settled_at: null,
  live: true,
  ...over,
});

const win = (over: Partial<MarketWindow>): MarketWindow => ({
  id: `w${seq++}`,
  created_at: at(600),
  updated_at: null,
  ticker: 'KXBTC15M-26NOV010115-15',
  event_ticker: null,
  title: null,
  open_time: at(600),
  close_time: at(-300),
  strike: 77677.14,
  strike_type: 'greater_or_equal',
  spot_open: null,
  spot_close: null,
  status: 'open',
  result: null,
  bets_placed: 0,
  max_bets: 2,
  pnl_cents: null,
  ...over,
});

const signal = (over: Partial<BotSignal>): BotSignal => ({
  id: `s${seq++}`,
  created_at: at(5),
  ticker: 'KXBTC15M-26NOV010115-15',
  spot: 77_700,
  strike: 77_677.14,
  seconds_to_close: 300,
  yes_ask_cents: 60,
  no_ask_cents: 42,
  gbm_prob: 0.5,
  ml_prob: 0.75,
  composite_prob: 0.65,
  market_prob: 0.59,
  edge: 0.06,
  kelly: 0.1,
  side: 'yes',
  action: 'buy',
  reason: null,
  kalshi_ws: true,
  live: true,
  ...over,
});

describe('window tracker', () => {
  it('tracks bets against the 2-bet cap', () => {
    const T = 'KXBTC15M-26NOV010115-15';
    const one = windowTracker([exec({ ticker: T }), exec({ ticker: 'OTHER' })], T);
    expect(one.placed).toBe(1);
    expect(one.remaining).toBe(1);
    expect(one.locked).toBe(false);
    expect(slotGlyphs(one.slots)).toBe('[● ◯]');
    expect(one.stakeCents).toBe(1000);
    const two = windowTracker([exec({ ticker: T }), exec({ ticker: T, bet_number: 2 })], T);
    expect(two.placed).toBe(2);
    expect(two.locked).toBe(true);
    expect(slotGlyphs(two.slots)).toBe('[● ●]');
    expect(slotGlyphs(windowTracker([], null).slots)).toBe('[◯ ◯]');
    expect(MAX_BETS_PER_WINDOW).toBe(2);
  });

  it('never exceeds the cap and ignores rejected orders', () => {
    const T = 'KXBTC15M-26NOV010115-15';
    const w = windowTracker(
      [
        exec({ ticker: T }),
        exec({ ticker: T }),
        exec({ ticker: T }),
        exec({ ticker: T, status: 'rejected' }),
      ],
      T,
    );
    expect(w.placed).toBe(2);
    expect(w.locked).toBe(true);
    expect(w.executions).toHaveLength(4);
    expect(w.stakeCents).toBe(3000);
    const r = windowTracker([exec({ ticker: T, status: 'rejected' })], T);
    expect(r.placed).toBe(0);
    expect(r.locked).toBe(false);
  });
});

describe('performance', () => {
  it('sums settled P&L, wins and the last 24 hours', () => {
    const p = performance(
      [
        exec({ pnl_cents: 3944, settled_at: at(100) }),
        exec({ pnl_cents: -1056, settled_at: at(2 * 86_400) }),
        exec({}),
        exec({ status: 'rejected' }),
      ],
      NOW,
    );
    expect(p.trades).toBe(3);
    expect(p.settled).toBe(2);
    expect(p.open).toBe(1);
    expect(p.wins).toBe(1);
    expect(p.winRate).toBe(0.5);
    expect(p.netCents).toBe(2888);
    expect(p.net24hCents).toBe(3944);
    expect(p.openStakeCents).toBe(1000);
    expect(p.equity.map((e) => e.cumCents)).toEqual([-1056, 2888]);
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

  it('sizes with Kelly and blends the models 40/60', () => {
    expect(kellyFraction(0.5, 20)).toBeCloseTo(0.375, 6);
    expect(kellyFraction(0.1, 20)).toBe(0);
    const m = modelMatrix({ gbm: 0.5, ml: 0.75, yesAsk: 60, noAsk: 42 });
    expect(m.composite).toBeCloseTo(0.65, 6);
    expect(m.market).toBeCloseTo(0.59, 6);
    expect(m.side).toBe('yes');
    expect(m.edgeCents!).toBeGreaterThan(0);
    expect(m.kellyStakeCents).toBe(Math.round(kellyFraction(0.65, 60) * BET_CENTS));
    const solo = modelMatrix({ gbm: 0.3, yesAsk: 60, noAsk: 42, sigma: 0.8 });
    expect(solo.composite).toBe(0.3);
    expect(solo.ml).toBeNull();
    expect(solo.sigmaSource).toBe('realized');
    expect(solo.side).toBe('no');
    expect(modelMatrix({ gbm: 0.5, yesAsk: 50, noAsk: 50 }).side).toBeNull();
    expect(modelMatrix({ gbm: null, yesAsk: 50, noAsk: 50 }).composite).toBeNull();
  });

  it('prefers the bot signal and falls back to local GBM', () => {
    const local = {
      spot: 77_700,
      strike: 77_677.14,
      secondsToClose: 300,
      sigma: null,
      strikeType: null,
    };
    const fromBot = matrixFromSignal(signal({}), local, { yesAsk: null, noAsk: null });
    expect(fromBot.source).toBe('bot');
    expect(fromBot.composite).toBeCloseTo(0.65, 6);
    expect(fromBot.market).toBeCloseTo(0.59, 6);
    const fallback = matrixFromSignal(null, local, { yesAsk: 60, noAsk: 42 });
    expect(fallback.source).toBe('local');
    expect(fallback.gbm).not.toBeNull();
    expect(fallback.ml).toBeNull();
  });
});

describe('terminal lines and status', () => {
  it('formats executions, signals and windows', () => {
    const x = executionLine(exec({ pnl_cents: 3944 }));
    expect(x.level).toBe('ok');
    expect(x.text).toBe(
      '[LIVE] BET 1/2 BUY NO 26NOV010115-15 50×20¢ fill 50/50 @20¢ fee $0.56 42ms → WON +$39.44',
    );
    expect(executionLine(exec({ status: 'rejected', fill_count: null })).level).toBe('err');
    expect(executionLine(exec({ pnl_cents: -1056 })).level).toBe('warn');
    const s = signalLine(signal({}));
    expect(s.level).toBe('ok');
    expect(s.text).toContain('gbm=50% ml=75% mkt=59% edge=6.0¢ BUY YES');
    expect(signalLine(signal({ action: 'hold', side: null })).level).toBe('tick');
    expect(windowLine(win({ bets_placed: 1 })).text).toBe(
      'window 26NOV010115-15 open strike $77,677.14 1/2 bets',
    );
    expect(windowLine(win({ status: 'settled', result: 'yes', pnl_cents: -1056 })).text).toContain(
      'settled YES −$10.56',
    );
  });

  it('merges lines by id in time order and caps them', () => {
    const a = { id: 'a', at: at(30), level: 'info' as const, text: 'a' };
    const b = { id: 'b', at: at(10), level: 'info' as const, text: 'b' };
    const merged = mergeLines([b], [a, { ...b, text: 'b2' }], 2);
    expect(merged.map((l) => l.text)).toEqual(['a', 'b2']);
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
