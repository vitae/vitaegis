import { describe, expect, it } from 'vitest';
import { entryZone, summarize, type KalshiEvent } from './kalshi';

const base: KalshiEvent = {
  id: '',
  created_at: '',
  kind: 'tick',
  live: false,
  ticker: null,
  close_time: null,
  yes_ask_cents: null,
  no_ask_cents: null,
  outcome: null,
  price_cents: null,
  count: null,
  order_id: null,
  fill_count: null,
  remaining_count: null,
  avg_fill_cents: null,
  balance_cents: null,
  message: null,
};

const NOW = Date.parse('2026-10-31T20:00:00Z');
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
const ev = (over: Partial<KalshiEvent>): KalshiEvent => ({
  ...base,
  id: Math.random().toString(36),
  ...over,
});

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
});

describe('summarize', () => {
  it('reads status, market and orders from the newest rows', () => {
    const events = [
      ev({
        kind: 'status',
        created_at: at(3600),
        live: true,
        balance_cents: 12345,
        message: 'started',
      }),
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
      ev({
        kind: 'tick',
        created_at: at(20),
        live: true,
        ticker: 'B',
        yes_ask_cents: 84,
        no_ask_cents: 17,
        close_time: at(-600),
      }),
      ev({ kind: 'error', created_at: at(900), live: true, message: 'HTTP 429' }),
    ];
    const s = summarize(events, NOW);
    expect(s.online).toBe(true);
    expect(s.live).toBe(true);
    expect(s.balanceCents).toBe(12345);
    expect(s.market?.ticker).toBe('B');
    expect(s.market?.entry).toEqual({ outcome: 'no', priceCents: 17 });
    expect(s.orders24h).toBe(1);
    expect(s.orders.map((o) => o.ticker)).toEqual(['A', 'OLD']);
    expect(s.errors).toHaveLength(1);
  });

  it('is offline with no rows or stale rows', () => {
    expect(summarize([], NOW).online).toBe(false);
    expect(summarize([ev({ created_at: at(600) })], NOW).online).toBe(false);
  });
});
