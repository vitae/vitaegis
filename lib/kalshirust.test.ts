import { describe, expect, it } from 'vitest';
import { kalshiFeeCents, summarize, type KalshirustEvent } from './kalshirust';

const base: KalshirustEvent = {
  id: '',
  created_at: '',
  kind: 'status',
  source: 'bot',
  mode: 'NORMAL',
  live: false,
  ticker: null,
  title: null,
  subtitle: null,
  close_time: null,
  seconds_to_close: null,
  spot: null,
  strike: null,
  cap_strike: null,
  strike_type: null,
  vol_window: null,
  yes_bid_cents: null,
  yes_ask_cents: null,
  no_ask_cents: null,
  model_prob: null,
  edge_cents: null,
  side: null,
  price_cents: null,
  count: null,
  cost_cents: null,
  fee_cents: null,
  client_order_id: null,
  order_id: null,
  result: null,
  pnl_cents: null,
  message: null,
};

const NOW = Date.parse('2026-11-01T20:00:00Z');
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
let seq = 0;
const ev = (over: Partial<KalshirustEvent>): KalshirustEvent => ({
  ...base,
  id: `e${seq++}`,
  ...over,
});

describe('kalshiFeeCents', () => {
  it('matches Kalshi’s 7% of C·P·(1−P), rounded up', () => {
    expect(kalshiFeeCents(10, 50)).toBe(18);
    expect(kalshiFeeCents(58, 17)).toBe(58);
  });
});

describe('summarize', () => {
  it('joins signals to settles by client_order_id and totals them', () => {
    const events = [
      ev({ kind: 'status', created_at: at(300), model_prob: 0.4, yes_ask_cents: 45 }),
      ev({
        kind: 'signal',
        created_at: at(200),
        ticker: 'KXBTC15M-A',
        side: 'yes',
        price_cents: 40,
        count: 10,
        cost_cents: 400,
        fee_cents: 17,
        model_prob: 0.55,
        edge_cents: 3.2,
        client_order_id: 'a',
      }),
      ev({
        kind: 'signal',
        created_at: at(100),
        ticker: 'KXBTC15M-B',
        side: 'no',
        price_cents: 60,
        count: 5,
        cost_cents: 300,
        fee_cents: 9,
        client_order_id: 'b',
      }),
      ev({
        kind: 'settle',
        created_at: at(50),
        client_order_id: 'a',
        result: 'yes',
        pnl_cents: 583,
      }),
      ev({ kind: 'status', created_at: at(10), model_prob: 0.6, yes_ask_cents: 58 }),
    ];
    const s = summarize(events, NOW);
    expect(s.trades.map((t) => t.ticker)).toEqual(['KXBTC15M-B', 'KXBTC15M-A']);
    expect(s.trades[1]).toMatchObject({
      side: 'yes',
      priceCents: 40,
      count: 10,
      modelProb: 0.55,
      edgeCents: 3.2,
      result: 'yes',
      pnlCents: 583,
      settledAt: at(50),
    });
    expect(s.trades[0]).toMatchObject({ result: null, pnlCents: null, settledAt: null });
    expect(s.totals).toMatchObject({
      trades: 2,
      settled: 1,
      wins: 1,
      losses: 0,
      hitRate: 1,
      riskedCents: 417,
      pnlCents: 583,
      roi: 583 / 417,
    });
    expect(s.totals.bySource.bot.trades).toBe(2);
    expect(s.totals.bySource.sniper).toMatchObject({
      trades: 0,
      settled: 0,
      pnlCents: 0,
      roi: null,
    });
    expect(s.watchlist).toEqual([]);
    expect(s.history.map((h) => h.yesAskCents)).toEqual([45, 58]);
    expect(s.status?.yes_ask_cents).toBe(58);
  });

  it('counts a settle against the entered side as a loss', () => {
    const s = summarize(
      [
        ev({
          kind: 'signal',
          created_at: at(100),
          side: 'no',
          cost_cents: 100,
          fee_cents: 2,
          client_order_id: 'x',
        }),
        ev({
          kind: 'settle',
          created_at: at(10),
          client_order_id: 'x',
          result: 'yes',
          pnl_cents: -102,
        }),
      ],
      NOW,
    );
    expect(s.totals).toMatchObject({ settled: 1, wins: 0, losses: 1, hitRate: 0, pnlCents: -102 });
  });

  it('coerces numeric strings from postgres', () => {
    const s = summarize(
      [ev({ kind: 'status', created_at: at(5), model_prob: '0.42' as unknown as number })],
      NOW,
    );
    expect(s.history[0].modelProb).toBe(0.42);
  });

  it('is online only while the newest status is under 90 s old', () => {
    expect(summarize([ev({ kind: 'status', created_at: at(30) })], NOW).online).toBe(true);
    expect(summarize([ev({ kind: 'status', created_at: at(120) })], NOW).online).toBe(false);
    expect(summarize([ev({ kind: 'error', created_at: at(1), message: 'x' })], NOW).online).toBe(
      false,
    );
    expect(summarize([], NOW)).toMatchObject({ status: null, online: false, trades: [] });
  });

  it('splits totals by source and tags each trade', () => {
    const s = summarize(
      [
        ev({
          kind: 'signal',
          created_at: at(400),
          side: 'yes',
          cost_cents: 200,
          fee_cents: 5,
          client_order_id: 'b1',
        }),
        ev({
          kind: 'settle',
          created_at: at(300),
          client_order_id: 'b1',
          result: 'yes',
          pnl_cents: 295,
        }),
        ev({
          kind: 'signal',
          created_at: at(200),
          source: 'sniper',
          side: 'no',
          cost_cents: 500,
          fee_cents: 10,
          client_order_id: 's1',
        }),
        ev({
          kind: 'settle',
          created_at: at(100),
          source: 'sniper',
          client_order_id: 's1',
          result: 'yes',
          pnl_cents: -510,
        }),
        ev({
          kind: 'signal',
          created_at: at(50),
          source: 'sniper',
          side: 'yes',
          cost_cents: 100,
          fee_cents: 2,
          client_order_id: 's2',
        }),
      ],
      NOW,
    );
    expect(s.trades.map((t) => t.source)).toEqual(['sniper', 'sniper', 'bot']);
    expect(s.totals).toMatchObject({ trades: 3, settled: 2, wins: 1, losses: 1, pnlCents: -215 });
    expect(s.totals.bySource.bot).toMatchObject({
      trades: 1,
      settled: 1,
      wins: 1,
      pnlCents: 295,
      riskedCents: 205,
    });
    expect(s.totals.bySource.sniper).toMatchObject({
      trades: 2,
      settled: 1,
      wins: 0,
      losses: 1,
      hitRate: 0,
      pnlCents: -510,
      riskedCents: 510,
      roi: -1,
    });
  });

  it('keeps the newest watch row per ticker from the last 10 minutes, best edge first', () => {
    const watch = (
      secondsAgo: number,
      ticker: string,
      edge: number,
      over: Partial<KalshirustEvent> = {},
    ) =>
      ev({
        kind: 'watch',
        source: 'sniper',
        created_at: at(secondsAgo),
        ticker,
        edge_cents: edge,
        ...over,
      });
    const s = summarize(
      [
        watch(500, 'KXBTC-A', 9),
        watch(60, 'KXBTC-A', 1.5, {
          side: 'no',
          price_cents: 40,
          title: 'BTC above 70k',
          strike_type: 'greater',
          strike: 70000,
        }),
        watch(60, 'KXBTC15M-B', 4),
        watch(60, 'KXBTCD-C', null as unknown as number),
        watch(900, 'BTCD-OLD', 20),
        ev({ kind: 'watch', source: 'sniper', created_at: at(10), ticker: null, edge_cents: 50 }),
      ],
      NOW,
    );
    expect(s.watchlist.map((w) => [w.ticker, w.edgeCents])).toEqual([
      ['KXBTC15M-B', 4],
      ['KXBTC-A', 1.5],
      ['KXBTCD-C', null],
    ]);
    expect(s.watchlist[1]).toMatchObject({
      side: 'no',
      priceCents: 40,
      title: 'BTC above 70k',
      strikeType: 'greater',
      strike: 70000,
      at: at(60),
    });
  });

  it('caps the watchlist at 15', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      ev({ kind: 'watch', source: 'sniper', created_at: at(30), ticker: `T${i}`, edge_cents: i }),
    );
    const s = summarize(events, NOW);
    expect(s.watchlist).toHaveLength(15);
    expect(s.watchlist[0].ticker).toBe('T19');
  });

  it('keeps the last five errors, newest first', () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      ev({ kind: 'error', created_at: at(70 - i * 10), message: `err${i}` }),
    );
    const s = summarize(events, NOW);
    expect(s.errors.map((e) => e.message)).toEqual(['err6', 'err5', 'err4', 'err3', 'err2']);
  });
});
