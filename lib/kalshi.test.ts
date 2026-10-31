import { describe, expect, it } from 'vitest';
import {
  backtest,
  entryZone,
  kalshiFeeCents,
  marketTitle,
  performance,
  pnlCents,
  publicSummary,
  simulateMarket,
  summarize,
  tradeFrom,
  type KalshiEvent,
  type PathPoint,
} from './kalshi';

const base: KalshiEvent = {
  id: '',
  created_at: '',
  kind: 'tick',
  live: false,
  ticker: null,
  title: null,
  close_time: null,
  seconds_to_close: null,
  yes_ask_cents: null,
  no_ask_cents: null,
  client_order_id: null,
  outcome: null,
  price_cents: null,
  count: null,
  order_id: null,
  fill_count: null,
  remaining_count: null,
  avg_fill_cents: null,
  fee_cents: null,
  latency_ms: null,
  result: null,
  pnl_cents: null,
  settled_at: null,
  path: null,
  balance_cents: null,
  message: null,
};

const NOW = Date.parse('2026-10-31T20:00:00Z');
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
let seq = 0;
const ev = (over: Partial<KalshiEvent>): KalshiEvent => ({ ...base, id: `e${seq++}`, ...over });

describe('entryZone', () => {
  it('snipes the cheap side when the other is heavy', () => {
    expect(entryZone(84, 17)).toEqual({ outcome: 'no', priceCents: 17 });
    expect(entryZone(25, 75)).toEqual({ outcome: 'yes', priceCents: 25 });
  });

  it('stays out of balanced markets, dead contracts and empty books', () => {
    expect(entryZone(60, 40)).toBeNull();
    expect(entryZone(95, 5)).toBeNull();
    expect(entryZone(null, 20)).toBeNull();
  });

  it('widens with a higher ceiling', () => {
    expect(entryZone(61, 40)).toBeNull();
    expect(entryZone(61, 40, 8, 40)).toEqual({ outcome: 'no', priceCents: 40 });
  });
});

describe('fees and P&L', () => {
  it('matches Kalshi’s 7% of C·P·(1−P), rounded up', () => {
    expect(kalshiFeeCents(58, 17)).toBe(58);
    expect(kalshiFeeCents(35, 28)).toBe(50);
  });

  it('pays 100¢ per contract on a win and loses the stake otherwise', () => {
    expect(pnlCents('no', 'no', 58, 17, 58)).toBe(58 * 83 - 58);
    expect(pnlCents('no', 'yes', 58, 17, 58)).toBe(-(58 * 17) - 58);
  });
});

describe('tradeFrom', () => {
  it('uses the real fill when live, the request when dry', () => {
    const live = tradeFrom(
      ev({
        kind: 'order',
        live: true,
        outcome: 'no',
        price_cents: 17,
        count: 58,
        fill_count: 50,
        avg_fill_cents: 18,
        fee_cents: 44,
        result: 'no',
        pnl_cents: 50 * 82 - 44,
      }),
    );
    expect(live.contracts).toBe(50);
    expect(live.entryCents).toBe(18);
    expect(live.won).toBe(true);
    expect(live.roi).toBeCloseTo((50 * 82 - 44) / (50 * 18));

    const dry = tradeFrom(ev({ kind: 'order', outcome: 'yes', price_cents: 25, count: 40 }));
    expect(dry.contracts).toBe(40);
    expect(dry.feeCents).toBe(kalshiFeeCents(40, 25));
    expect(dry.settled).toBe(false);
    expect(dry.pnlCents).toBeNull();
  });
});

describe('performance', () => {
  it('totals settled trades and builds the equity curve oldest first', () => {
    const trades = [
      ev({
        kind: 'order',
        created_at: at(100),
        settled_at: at(50),
        outcome: 'no',
        price_cents: 20,
        count: 50,
        result: 'no',
        pnl_cents: 3900,
        latency_ms: 120,
        seconds_to_close: 300,
      }),
      ev({
        kind: 'order',
        created_at: at(900),
        settled_at: at(800),
        outcome: 'yes',
        price_cents: 25,
        count: 40,
        result: 'no',
        pnl_cents: -1050,
        latency_ms: 80,
        seconds_to_close: 500,
      }),
      ev({ kind: 'order', created_at: at(10), outcome: 'no', price_cents: 22, count: 45 }),
    ].map(tradeFrom);
    const p = performance(trades);
    expect(p.trades).toBe(3);
    expect(p.settled).toBe(2);
    expect(p.open).toBe(1);
    expect(p.winRate).toBe(0.5);
    expect(p.netCents).toBe(2850);
    expect(p.equity.map((e) => e.cumCents)).toEqual([-1050, 2850]);
    expect(p.avgLatencyMs).toBe(100);
    expect(p.avgSecondsToClose).toBe(400);
    expect(p.best?.pnlCents).toBe(3900);
    expect(p.worst?.pnlCents).toBe(-1050);
  });
});

describe('backtest', () => {
  // Crowd drifts to YES over the market; the cheap NO side gets cheaper as it goes.
  const path: PathPoint[] = [
    [800, 60, 40],
    [600, 70, 30],
    [400, 80, 20],
  ];

  it('enters at the first quote inside the ceiling', () => {
    expect(simulateMarket(path, 'no', 28)?.priceCents).toBe(20);
    expect(simulateMarket(path, 'no', 30)?.priceCents).toBe(30);
    expect(simulateMarket(path, 'no', 40)?.priceCents).toBe(40);
    expect(simulateMarket(path, 'no', 15)).toBeNull();
  });

  it('ranks thresholds by net P&L over settled markets', () => {
    const settles = Array.from({ length: 6 }, (_, i) =>
      ev({ kind: 'settle', created_at: at(i * 900), result: i < 4 ? 'yes' : 'no', path }),
    );
    const b = backtest(settles, [28, 40]);
    expect(b.markets).toBe(6);
    expect(b.confidence).toBe('low');
    const r28 = b.rows[0];
    const r40 = b.rows[1];
    expect(r28.trades).toBe(6);
    expect(r28.wins).toBe(2);
    // 2 wins of 50×80−fee, 4 losses of 50×20+fee at 20¢; at 40¢ it is 25 contracts.
    const fee20 = kalshiFeeCents(50, 20);
    expect(r28.netCents).toBe(2 * (50 * 80 - fee20) - 4 * (50 * 20 + fee20));
    const fee40 = kalshiFeeCents(25, 40);
    expect(r40.netCents).toBe(2 * (25 * 60 - fee40) - 4 * (25 * 40 + fee40));
    expect(b.best?.maxEntry).toBe(r40.netCents > r28.netCents ? 40 : 28);
    expect(b.current?.maxEntry).toBe(28);
  });

  it('has nothing to say without settled paths', () => {
    expect(backtest([]).confidence).toBe('none');
    expect(backtest([]).best).toBeNull();
  });
});

describe('marketTitle', () => {
  it('prefers Kalshi’s title and otherwise reads the ticker', () => {
    expect(marketTitle('KXBTC15M-26OCT311630-30', 'Bitcoin up at 4:30?')).toBe(
      'Bitcoin up at 4:30?',
    );
    expect(marketTitle('KXBTC15M-26OCT311630-30', null)).toBe('Bitcoin at 4:30 PM ET · Oct 31');
    expect(marketTitle('KXBTC15M-26NOV010015-15', null)).toBe('Bitcoin at 12:15 AM ET · Nov 1');
    expect(marketTitle('WEIRD', null)).toBe('WEIRD');
  });
});

describe('summaries', () => {
  const ticks = [
    ev({ kind: 'tick', created_at: at(60), ticker: 'B', yes_ask_cents: 70, no_ask_cents: 31 }),
    ev({
      kind: 'tick',
      created_at: at(20),
      ticker: 'B',
      yes_ask_cents: 84,
      no_ask_cents: 17,
      close_time: at(-600),
    }),
    ev({ kind: 'tick', created_at: at(2000), ticker: 'A', yes_ask_cents: 50, no_ask_cents: 50 }),
  ];

  it('admin summary reads status, market and orders from the newest rows', () => {
    const events = [
      ...ticks,
      ev({ kind: 'status', created_at: at(3600), live: true, balance_cents: 12345 }),
      ev({
        kind: 'order',
        created_at: at(1800),
        live: true,
        ticker: 'A',
        outcome: 'no',
        price_cents: 20,
        count: 50,
      }),
      ev({
        kind: 'order',
        created_at: at(2 * 86400),
        live: true,
        ticker: 'OLD',
        outcome: 'yes',
        price_cents: 10,
        count: 1,
      }),
      ev({ kind: 'error', created_at: at(900), message: 'HTTP 429' }),
    ];
    const s = summarize(events, NOW);
    expect(s.online).toBe(true);
    expect(s.balanceCents).toBe(12345);
    expect(s.market?.ticker).toBe('B');
    expect(s.market?.series.map((p) => p.yes)).toEqual([70, 84]);
    expect(s.market?.entry).toEqual({ outcome: 'no', priceCents: 17 });
    expect(s.orders24h).toBe(1);
    expect(s.errors).toHaveLength(1);
  });

  it('public summary carries no balance and links trades to their markets', () => {
    const order = ev({
      kind: 'order',
      created_at: at(1800),
      ticker: 'A',
      outcome: 'no',
      price_cents: 20,
      count: 50,
      result: 'no',
      pnl_cents: 3900,
    });
    const p = publicSummary(
      {
        newest: ticks[1],
        ticks,
        orders: [order],
        settles: [
          ev({
            kind: 'settle',
            created_at: at(1000),
            ticker: 'A',
            result: 'no',
            path: [[500, 80, 20]],
          }),
        ],
        errors: [],
      },
      NOW,
    );
    expect(p.online).toBe(true);
    expect('balanceCents' in p).toBe(false);
    expect(p.market?.ticker).toBe('B');
    expect(p.performance.netCents).toBe(3900);
    expect(p.markets[0].trades).toHaveLength(1);
    expect(p.backtest.markets).toBe(1);
  });

  it('is offline with no rows or stale rows', () => {
    expect(summarize([], NOW).online).toBe(false);
    expect(summarize([ev({ created_at: at(600) })], NOW).online).toBe(false);
  });
});
