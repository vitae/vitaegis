import { afterEach, describe, expect, it, vi } from 'vitest';
import { stocks } from '@/app/stocks/data';
import { getStockPrices } from './stocks';

// Nasdaq: two bars per ticker, Dec 31, 2025 at $1,000 and Sep 23, 2026 at $1,500.
const nasdaqBody = {
  data: {
    tradesTable: {
      rows: [
        { date: '09/23/2026', close: '$1,500.00' },
        { date: '12/31/2025', close: '$1,000.00' },
      ],
    },
  },
};

// Yahoo: the same two days at 100 and 150.
const yahooBody = {
  chart: {
    result: [
      {
        timestamp: [
          Date.parse('2025-12-31T14:30:00Z') / 1000,
          Date.parse('2026-09-23T13:30:00Z') / 1000,
        ],
        indicators: { quote: [{ close: [100, 150] }] },
      },
    ],
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => Promise.resolve(handler(String(input)))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getStockPrices', () => {
  it('uses Nasdaq when it answers', async () => {
    mockFetch((url) => (url.includes('api.nasdaq.com') ? json(nasdaqBody) : json({}, 500)));
    const data = await getStockPrices();
    expect(data.source).toBe('live');
    expect(data.prices.NVDA).toBe(1500);
    expect(data.starts.NVDA.ytd).toBe(1000);
    expect(data.starts.NVDA['1d']).toBe(1000);
    expect(data.startDates.ytd).toBe('2025-12-31');
    expect(data.asOf).toBe('2026-09-23T12:00:00.000Z');
  });

  it('dates the board by stocks, not by a newer crypto bar', async () => {
    const btcBody = {
      data: {
        tradesTable: {
          rows: [{ date: '09/24/2026', close: '90,000.00' }, ...nasdaqBody.data.tradesTable.rows],
        },
      },
    };
    mockFetch((url) => json(url.includes('/BTC/') ? btcBody : nasdaqBody));
    const data = await getStockPrices();
    expect(data.prices.BTC).toBe(90000);
    expect(data.asOf).toBe('2026-09-23T12:00:00.000Z');
  });

  it('asks Nasdaq for the right asset class', async () => {
    const urls: string[] = [];
    mockFetch((url) => {
      urls.push(url);
      return json(nasdaqBody);
    });
    await getStockPrices();
    expect(urls.find((u) => u.includes('/SPY/'))).toContain('assetclass=etf');
    expect(urls.find((u) => u.includes('/SNDK/'))).toContain('assetclass=stocks');
    expect(urls.find((u) => u.includes('/BTC/'))).toContain('assetclass=crypto');
  });

  it('falls back to Yahoo per ticker when Nasdaq fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch((url) =>
      url.includes('api.nasdaq.com') ? json({ data: null }, 403) : json(yahooBody),
    );
    const data = await getStockPrices();
    expect(data.source).toBe('live');
    expect(data.prices.SNDK).toBe(150);
    expect(data.starts.SNDK.ytd).toBe(100);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('serves the snapshot when both sources fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch(() => json({}, 500));
    const data = await getStockPrices();
    expect(data.source).toBe('snapshot');
    for (const s of stocks) {
      expect(data.prices[s.ticker]).toBe(s.end);
      expect(data.starts[s.ticker]).toEqual({ ytd: s.start });
    }
  });

  it('keeps live tickers live when only some fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch((url) => (url.includes('/NVDA') ? json({}, 500) : json(nasdaqBody)));
    const data = await getStockPrices();
    expect(data.source).toBe('live');
    const nvda = stocks.find((s) => s.ticker === 'NVDA')!;
    expect(data.prices.NVDA).toBe(nvda.end);
    expect(data.starts.NVDA).toEqual({ ytd: nvda.start });
    expect(data.prices.AMD).toBe(1500);
  });
});
