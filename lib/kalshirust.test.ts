import { describe, expect, it } from 'vitest';
import {
  hostLabel,
  hostOnline,
  hostState,
  kalshiFeeCents,
  kalshiUrl,
  pendingCommand,
  summarize,
  summarizeBacktest,
  type HostConfig,
  type KalshirustEvent,
  exchangeCheck,
  expectedProfitCents,
  maxBuyCents,
  tradeSlot,
} from './kalshirust';

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

describe('kalshiUrl', () => {
  it('links the series and the event, dropping the strike segment', () => {
    expect(kalshiUrl('KXBTC15M-26NOV011930-30')).toBe(
      'https://kalshi.com/markets/kxbtc15m/x/kxbtc15m-26nov011930',
    );
    expect(kalshiUrl('KXBTCD-26NOV0120-T78399.99')).toBe(
      'https://kalshi.com/markets/kxbtcd/x/kxbtcd-26nov0120',
    );
  });
});

describe('summarize', () => {
  it('derives P(win), the market’s implied P(win), EV and max win per trade', () => {
    const s = summarize(
      [
        ev({
          kind: 'signal',
          created_at: at(100),
          side: 'no',
          price_cents: 44,
          count: 10,
          fee_cents: 17,
          model_prob: 0.43,
          edge_cents: 3.2,
          close_time: at(-120),
        }),
        ev({ kind: 'signal', created_at: at(50), side: 'yes', price_cents: 60, model_prob: 0.7 }),
      ],
      NOW,
    );
    expect(s.trades[1].pWin).toBeCloseTo(0.57);
    expect(s.trades[1]).toMatchObject({
      marketPWin: 0.44,
      evCents: 32,
      maxWinCents: 10 * 56 - 17,
      closeTime: at(-120),
    });
    expect(s.trades[0]).toMatchObject({
      pWin: 0.7,
      marketPWin: 0.6,
      evCents: null,
      maxWinCents: null,
    });
  });

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

  it('keeps the newest YES row per ticker from the last 10 minutes, best expected profit first', () => {
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
        watch(500, 'KXBTC-A', 9, { side: 'yes' }),
        watch(60, 'KXBTC-A', 1.5, {
          side: 'yes',
          price_cents: 40,
          model_prob: 0.75,
          message: 'BTC trending down',
          title: 'BTC above 70k',
          strike_type: 'greater',
          strike: 70000,
        }),
        watch(60, 'KXBTC15M-B', 4, { side: 'yes', model_prob: 0.9, price_cents: 80 }),
        watch(60, 'KXBTCD-C', null as unknown as number, { side: 'yes' }),
        watch(60, 'KXBTC-NO', 30, { side: 'no', model_prob: 0.1, price_cents: 50 }),
        watch(900, 'BTCD-OLD', 20, { side: 'yes' }),
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
      side: 'yes',
      priceCents: 40,
      note: 'BTC trending down',
      expectedProfitCents: 18,
      title: 'BTC above 70k',
      strikeType: 'greater',
      strike: 70000,
      at: at(60),
    });
    expect(s.watchlist.map((w) => w.pWin)).toEqual([0.9, 0.75, null]);
  });

  it('lists YES picks only, with the model P(YES) as the win chance', () => {
    const watch = (side: 'yes' | 'no' | null, modelProb: number | null) =>
      ev({
        kind: 'watch',
        source: 'sniper',
        created_at: at(30),
        ticker: `T-${side}-${modelProb}`,
        side,
        model_prob: modelProb,
      });
    const s = summarize(
      [watch('no', 0.12), watch('yes', 0.8), watch(null, 0.12), watch('no', null)],
      NOW,
    );
    expect(s.watchlist.map((w) => [w.ticker, w.pWin, w.maxBuyCents])).toEqual([
      ['T-yes-0.8', 0.8, 75],
    ]);
  });

  it('prices the highest buy and the expected profit on the stake', () => {
    expect(maxBuyCents(0.8)).toBe(75);
    expect(maxBuyCents(0.01)).toBeNull();
    expect(maxBuyCents(null)).toBeNull();
    expect(expectedProfitCents(75, 3.5)).toBeCloseTo(21);
    expect(expectedProfitCents(null, 3)).toBeNull();
    expect(expectedProfitCents(75, null)).toBeNull();
  });

  it('caps the watchlist at 15', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      ev({
        kind: 'watch',
        source: 'sniper',
        created_at: at(30),
        ticker: `T${i}`,
        side: 'yes',
        price_cents: 50,
        edge_cents: i,
      }),
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

describe('UFC copy trades', () => {
  it('counts them under their own source, apart from the bot', () => {
    const NOW_MS = Date.parse('2026-11-02T10:00:00Z');
    const s = summarize(
      [
        {
          id: 'u1',
          kind: 'signal',
          source: 'ufc',
          created_at: '2026-11-02T09:00:00Z',
          ticker: 'KXUFCFIGHT-26NOV14GANHOK-HOK',
          client_order_id: 'ufc-1',
          side: 'yes',
          price_cents: 34,
          count: 14,
          cost_cents: 476,
          fee_cents: 22,
          live: false,
          mode: 'PAPER-UFC',
        } as KalshirustEvent,
      ],
      NOW_MS,
    );
    expect(s.trades[0].source).toBe('ufc');
    expect(s.totals.bySource.ufc.trades).toBe(1);
    expect(s.totals.bySource.bot.trades).toBe(0);
    expect(s.trades[0].slot).toBe('other');
  });
});

describe('shadow rule trades', () => {
  it('counts them under their own source, apart from the bot', () => {
    const NOW_MS = Date.parse('2026-11-04T21:30:00Z');
    const s = summarize(
      [
        {
          id: 's1',
          kind: 'signal',
          source: 'shadow',
          created_at: '2026-11-04T20:59:00Z',
          ticker: 'KXBTC15M-26NOV041600-00',
          client_order_id: 'shadow-KXBTC15M-26NOV041600-00-1793825940',
          side: 'yes',
          price_cents: 57,
          count: 8,
          cost_cents: 456,
          fee_cents: 14,
          live: false,
          mode: 'PAPER-NORMAL',
        } as KalshirustEvent,
        {
          id: 's2',
          kind: 'settle',
          source: 'shadow',
          created_at: '2026-11-04T21:00:08Z',
          ticker: 'KXBTC15M-26NOV041600-00',
          client_order_id: 'shadow-KXBTC15M-26NOV041600-00-1793825940',
          result: 'no',
          pnl_cents: -470,
          live: false,
          mode: 'PAPER-NORMAL',
        } as KalshirustEvent,
      ],
      NOW_MS,
    );
    expect(s.trades[0].source).toBe('shadow');
    expect(s.totals.bySource.shadow).toMatchObject({ trades: 1, settled: 1, pnlCents: -470 });
    expect(s.totals.bySource.bot.trades).toBe(0);
  });
});

describe('exchangeCheck', () => {
  const row = (message: string | null) =>
    ({ kind: 'reconcile', created_at: '2026-11-02T09:00:00Z', message }) as KalshirustEvent;

  it('reads the bot report into cents', () => {
    const c = exchangeCheck(
      row(
        JSON.stringify({
          fills: 3,
          settled_markets: 2,
          wins: 1,
          losses: 1,
          cost: 9.48,
          fees: 0.13,
          net: -3.61,
          net_today: -3.61,
          book_settled: 2,
          book_net: -3.61,
          open_tickers: ['T1'],
          problems: [],
        }),
      ),
    );
    expect(c).toMatchObject({
      fills: 3,
      settledMarkets: 2,
      wins: 1,
      losses: 1,
      costCents: 948,
      feesCents: 13,
      netCents: -361,
      bookNetCents: -361,
      openTickers: ['T1'],
      matches: true,
      at: '2026-11-02T09:00:00Z',
    });
  });

  it('marks a report with problems as not matching', () => {
    expect(exchangeCheck(row(JSON.stringify({ problems: ['T1: differs'] })))?.matches).toBe(false);
  });

  it('returns null without a usable report', () => {
    expect(exchangeCheck(undefined)).toBeNull();
    expect(exchangeCheck(row(null))).toBeNull();
    expect(exchangeCheck(row('not json'))).toBeNull();
  });

  it('summarize returns the newest report', () => {
    const NOW_MS = Date.parse('2026-11-02T10:00:00Z');
    const older = {
      ...row(JSON.stringify({ net: 1 })),
      id: 'a',
      created_at: '2026-11-02T09:00:00Z',
    };
    const newer = {
      ...row(JSON.stringify({ net: 2 })),
      id: 'b',
      created_at: '2026-11-02T09:30:00Z',
    };
    expect(summarize([newer, older], NOW_MS).exchange?.netCents).toBe(200);
    expect(summarize([], NOW_MS).exchange).toBeNull();
  });
});

describe('tradeSlot', () => {
  it('reads the slot from the order id prefix', () => {
    expect(tradeSlot('anytime-KXBTC15M-1')).toBe('anytime');
    expect(tradeSlot('sharp-KXBTC15M-1')).toBe('sharp');
    expect(tradeSlot('settle-KXBTC15M-1')).toBe('last90');
    expect(tradeSlot('sniper-KXBTC-1')).toBe('other');
    expect(tradeSlot(null)).toBe('other');
  });
});

describe('hostOnline', () => {
  it('is true only while host_seen_at is under 45 s old', () => {
    expect(hostOnline(at(0), NOW)).toBe(true);
    expect(hostOnline(at(44), NOW)).toBe(true);
    expect(hostOnline(at(45), NOW)).toBe(false);
    expect(hostOnline(at(3600), NOW)).toBe(false);
  });

  it('is false when the host never reported or the stamp is unreadable', () => {
    expect(hostOnline(null, NOW)).toBe(false);
    expect(hostOnline(undefined, NOW)).toBe(false);
    expect(hostOnline('', NOW)).toBe(false);
    expect(hostOnline('yesterday', NOW)).toBe(false);
  });
});

describe('hostLabel', () => {
  const cfg = (
    desiredState: HostConfig['desiredState'],
    hostStatus: string | null,
    seenSecondsAgo: number | null = 5,
  ): HostConfig => ({
    desiredState,
    hostStatus,
    hostSeenAt: seenSecondsAgo == null ? null : at(seenSecondsAgo),
  });

  it('says the VPS is offline after 45 s without a report, whatever it last said', () => {
    expect(hostLabel(cfg('running', 'running', 46), NOW)).toBe('VPS offline');
    expect(hostLabel(cfg('running', 'error: boom', 300), NOW)).toBe('VPS offline');
    expect(hostLabel(cfg('stopped', null, null), NOW)).toBe('VPS offline');
    expect(hostState(cfg('stopped', 'stopped', null), NOW)).toBe('offline');
  });

  it('reports the bot’s state once the host agrees with the command', () => {
    expect(hostLabel(cfg('running', 'running'), NOW)).toBe('Bot running');
    expect(hostLabel(cfg('stopped', 'stopped'), NOW)).toBe('Bot stopped');
    expect(hostLabel(cfg('stopped', null), NOW)).toBe('Bot stopped');
    expect(hostState(cfg('running', 'running'), NOW)).toBe('running');
  });

  it('shows the transition the host reported, or the command it has not picked up yet', () => {
    expect(hostLabel(cfg('running', 'starting'), NOW)).toBe('Starting…');
    expect(hostLabel(cfg('stopped', 'stopping'), NOW)).toBe('Stopping…');
    expect(hostLabel(cfg('running', 'stopped'), NOW)).toBe('Starting…');
    expect(hostLabel(cfg('stopped', 'running'), NOW)).toBe('Stopping…');
    expect(hostState(cfg('stopped', 'running'), NOW)).toBe('stopping');
  });

  it('passes an error through as the host wrote it', () => {
    const error = 'error: bot exited at once (journalctl -u kalshi-bot)';
    expect(hostLabel(cfg('running', error), NOW)).toBe(error);
    expect(hostLabel(cfg('stopped', error), NOW)).toBe(error);
    expect(hostState(cfg('running', error), NOW)).toBe('error');
  });

  it('names the command the host has not confirmed, for the RUN / STOP button', () => {
    expect(pendingCommand(cfg('running', 'running'))).toBeNull();
    expect(pendingCommand(cfg('running', 'stopped'))).toBe('starting');
    expect(pendingCommand(cfg('running', 'starting'))).toBe('starting');
    expect(pendingCommand(cfg('running', 'error: boom'))).toBe('starting');
    expect(pendingCommand(cfg('running', null))).toBe('starting');
    expect(pendingCommand(cfg('stopped', 'running'))).toBe('stopping');
    expect(pendingCommand(cfg('stopped', 'starting'))).toBe('stopping');
    expect(pendingCommand(cfg('stopped', 'stopping'))).toBe('stopping');
    expect(pendingCommand(cfg('stopped', 'stopped'))).toBeNull();
    expect(pendingCommand(cfg('stopped', 'error: boom'))).toBeNull();
    expect(pendingCommand(cfg('stopped', null))).toBeNull();
  });
});

describe('summarize windows', () => {
  const close = (secondsAgo: number, ticker: string, spot: number, strike: number) =>
    ev({
      kind: 'status',
      created_at: at(secondsAgo),
      ticker,
      spot,
      strike,
      seconds_to_close: 0,
      message: `settled ${spot.toFixed(2)} (${spot >= strike ? 'YES' : 'NO'}) | 60s: est …`,
    });
  const signal = (
    secondsAgo: number,
    ticker: string,
    order: string,
    over: Partial<KalshirustEvent> = {},
  ) =>
    ev({
      kind: 'signal',
      created_at: at(secondsAgo),
      ticker,
      client_order_id: order,
      side: 'yes',
      cost_cents: 500,
      fee_cents: 10,
      seconds_to_close: 120,
      ...over,
    });
  const settleRow = (secondsAgo: number, order: string, result: 'yes' | 'no', pnl: number) =>
    ev({
      kind: 'settle',
      created_at: at(secondsAgo),
      client_order_id: order,
      result,
      pnl_cents: pnl,
    });

  it('counts each closed window once, only from the bot’s zero-second settled rows', () => {
    const s = summarize(
      [
        close(3000, 'KXBTC15M-26NOV011900-00', 78010, 78000),
        close(2990, 'KXBTC15M-26NOV011900-00', 78010, 78000),
        close(2100, 'KXBTC15M-26NOV011915-00', 77990.5, 78000),
        ev({
          kind: 'status',
          created_at: at(1200),
          ticker: 'KXBTC15M-26NOV011930-00',
          seconds_to_close: 0,
          spot: 1,
          strike: 2,
        }),
        ev({
          kind: 'status',
          source: 'sniper',
          created_at: at(1100),
          ticker: 'KXBTCD-26NOV0120-T78399.99',
          seconds_to_close: 0,
          spot: 1,
          strike: 2,
          message: 'settled 1.00 (NO)',
        }),
        ev({
          kind: 'status',
          created_at: at(10),
          ticker: 'KXBTC15M-26NOV011945-00',
          seconds_to_close: 600,
          spot: 78001,
          strike: 78000,
        }),
      ],
      NOW,
    );
    expect(s.windows.observed).toBe(2);
    expect(s.windows.rows.map((r) => [r.ticker, r.outcome])).toEqual([
      ['KXBTC15M-26NOV011915-00', 'NO'],
      ['KXBTC15M-26NOV011900-00', 'YES'],
    ]);
    expect(s.windows.rows[1]).toEqual({
      ticker: 'KXBTC15M-26NOV011900-00',
      closedAt: at(2990),
      settled: 78010,
      strike: 78000,
      outcome: 'YES',
      trades: 0,
      enteredAfterOpenSecs: [],
      pnlCents: 0,
      hit: null,
    });
    expect(s.windows).toMatchObject({
      traded: 0,
      settledPnlCents: 0,
      perWindowCents: 0,
      projectedDayCents: 0,
      settledTrades: 0,
      avgProfitPerTradeCents: null,
    });
  });

  it('scores each window by the bot’s trades on it and leaves a pending window open', () => {
    const A = 'KXBTC15M-26NOV011900-00';
    const B = 'KXBTC15M-26NOV011915-00';
    const C = 'KXBTC15M-26NOV011930-00';
    const s = summarize(
      [
        close(2000, A, 78010, 78000),
        signal(2300, A, 'a2', { seconds_to_close: 300, side: 'no' }),
        settleRow(1990, 'a2', 'yes', -102),
        signal(2059, A, 'a1', { seconds_to_close: 59 }),
        settleRow(1990, 'a1', 'yes', 583),
        signal(2100, A, 'sn', { source: 'sniper' }),
        settleRow(1990, 'sn', 'yes', 1000),
        close(1100, B, 77990, 78000),
        signal(1200, B, 'b1', { side: 'no' }),
        settleRow(1090, 'b1', 'no', 295),
        close(200, C, 78000, 78000),
        signal(400, C, 'c1'),
        settleRow(190, 'c1', 'yes', 100),
        signal(300, C, 'c2', { seconds_to_close: 100 }),
        signal(3000, 'KXBTC15M-26NOV011845-00', 'orphan'),
        settleRow(2900, 'orphan', 'yes', 999),
      ],
      NOW,
    );
    expect(s.windows).toMatchObject({
      observed: 3,
      traded: 3,
      settledPnlCents: 876,
      perWindowCents: 292,
      projectedDayCents: 292 * 96,
      target: { normalCents: 20, riskCents: 300 },
    });
    expect(s.windows.rows.map((r) => r.ticker)).toEqual([C, B, A]);
    expect(s.windows.rows[0]).toMatchObject({
      outcome: 'YES',
      trades: 2,
      enteredAfterOpenSecs: [780, 800],
      pnlCents: null,
      hit: null,
    });
    expect(s.windows.rows[1]).toMatchObject({
      outcome: 'NO',
      trades: 1,
      enteredAfterOpenSecs: [780],
      pnlCents: 295,
      hit: true,
    });
    expect(s.windows.rows[2]).toMatchObject({
      trades: 2,
      enteredAfterOpenSecs: [600, 841],
      pnlCents: 481,
      hit: false,
    });
  });

  it('derives the entry time of 15-minute bot trades from the signal’s seconds to close', () => {
    const s = summarize(
      [
        signal(400, 'KXBTC15M-26NOV012000-00', 'a', { seconds_to_close: 59 }),
        signal(300, 'KXBTC15M-26NOV012000-00', 'b', {
          seconds_to_close: '241' as unknown as number,
        }),
        signal(200, 'KXBTC15M-26NOV012000-00', 'c', { source: 'sniper', seconds_to_close: 59 }),
        signal(100, 'KXBTCD-26NOV0120-T78399.99', 'd', { seconds_to_close: 3600 }),
        signal(50, 'KXBTC15M-26NOV012015-00', 'e', { seconds_to_close: null }),
      ],
      NOW,
    );
    expect(s.trades.map((t) => [t.secondsToClose, t.enteredAfterOpenSecs])).toEqual([
      [null, null],
      [3600, null],
      [59, null],
      [241, 659],
      [59, 841],
    ]);
  });

  it('is empty until a window closes, even with settled trades', () => {
    const empty = {
      observed: 0,
      traded: 0,
      settledPnlCents: 0,
      perWindowCents: null,
      projectedDayCents: null,
      settledTrades: 0,
      avgProfitPerTradeCents: null,
      target: { normalCents: 20, riskCents: 300 },
      rows: [],
    };
    expect(summarize([], NOW).windows).toEqual(empty);
    expect(
      summarize([signal(100, 'KXBTC15M-26NOV012000-00', 'a'), settleRow(10, 'a', 'yes', 50)], NOW)
        .windows,
    ).toEqual(empty);
  });
});

describe('summarizeBacktest', () => {
  const bt = (over: Partial<KalshirustEvent>) => ev({ source: 'backtest', ...over });
  const signal = (order: string, closeSecondsAgo: number, over: Partial<KalshirustEvent> = {}) =>
    bt({
      kind: 'signal',
      created_at: at(5),
      close_time: at(closeSecondsAgo),
      ticker: `KXBTC15M-${order}`,
      client_order_id: order,
      side: 'yes',
      price_cents: 55,
      count: 9,
      cost_cents: 495,
      fee_cents: 16,
      model_prob: 0.61,
      edge_cents: 4,
      message: 'entered 212s before close | gbm 61.0% | momentum +0.12%',
      ...over,
    });
  const settle = (order: string, result: 'yes' | 'no', pnl: number) =>
    bt({ kind: 'settle', created_at: at(3), client_order_id: order, result, pnl_cents: pnl });

  it('joins by client_order_id, oldest close first, and drops unsettled signals', () => {
    const b = summarizeBacktest(
      [signal('b', 900), signal('a', 1800), signal('orphan', 60)],
      [settle('a', 'yes', 389), settle('b', 'no', -511), settle('ghost', 'yes', 1)],
    );
    expect(b.trades.map((t) => t.ticker)).toEqual(['KXBTC15M-a', 'KXBTC15M-b']);
    expect(b.trades[0]).toMatchObject({
      at: at(1800),
      side: 'yes',
      priceCents: 55,
      count: 9,
      pWin: 0.61,
      marketPWin: 0.55,
      edgeCents: 4,
      evCents: 36,
      maxWinCents: 9 * 45 - 16,
      result: 'yes',
      pnlCents: 389,
      note: 'entered 212s before close | gbm 61.0% | momentum +0.12%',
    });
    expect(b.trades[1]).toMatchObject({ result: 'no', pnlCents: -511 });
    expect(b.ranAt).toBe(at(3));
  });

  it('totals, equity curve and price buckets', () => {
    const b = summarizeBacktest(
      [
        signal('a', 4000, { price_cents: 20, edge_cents: 2 }),
        signal('b', 3000, { price_cents: 45, edge_cents: 4 }),
        signal('c', 2000, { price_cents: 55, edge_cents: 6 }),
        signal('d', 1000, { price_cents: 80, side: 'no', edge_cents: 8 }),
      ],
      [
        settle('a', 'yes', 100),
        settle('b', 'no', -200),
        settle('c', 'yes', 50),
        settle('d', 'no', 25),
      ],
    );
    expect(b.totals).toEqual({
      trades: 4,
      wins: 3,
      losses: 1,
      hitRate: 0.75,
      riskedCents: 4 * 511,
      pnlCents: -25,
      roi: -25 / (4 * 511),
      avgEdgeCents: 5,
      avgPnlCents: -6.25,
    });
    expect(b.equity).toEqual([100, -100, -50, -25]);
    expect(b.byPriceBucket).toEqual([
      { bucket: '15–30¢', trades: 1, wins: 1, pnlCents: 100 },
      { bucket: '30–50¢', trades: 1, wins: 0, pnlCents: -200 },
      { bucket: '50–70¢', trades: 1, wins: 1, pnlCents: 50 },
      { bucket: '70–85¢', trades: 1, wins: 1, pnlCents: 25 },
    ]);
  });

  it('is empty without rows', () => {
    const b = summarizeBacktest([], []);
    expect(b.trades).toEqual([]);
    expect(b.equity).toEqual([]);
    expect(b.ranAt).toBeNull();
    expect(b.totals).toMatchObject({ trades: 0, hitRate: null, roi: null, avgEdgeCents: null });
    expect(b.byPriceBucket.map((r) => r.trades)).toEqual([0, 0, 0, 0]);
  });
});
