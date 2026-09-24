// Server-only: called from the /stocks page and /api/stocks route. Never import from a client component.
import { asOfSnapshot, stocks, yahooSymbol } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks
   Latest daily close for each ticker in app/stocks/data.ts, from Yahoo Finance's
   public chart endpoint. Shared by the /stocks page and /api/stocks so Next's
   data cache serves both from the same hourly fetch. Never throws: any ticker
   that fails falls back to its snapshot close; if all fail, `source` is
   'snapshot'.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const STOCKS_REVALIDATE_SECONDS = 3600;

export type StockSource = 'live' | 'snapshot';

export interface StockPrices {
  /** ISO timestamp of the newest bar, or `asOfSnapshot` when nothing was live. */
  asOf: string;
  prices: Record<string, number>;
  source: StockSource;
}

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: Array<number | null>;
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
}

// Yahoo answers 429 to requests without a browser user agent.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const chartUrl = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;

interface Bar {
  close: number;
  time: number;
}

/** Last non-null daily close for one symbol. Throws on any failure. */
async function fetchLastClose(symbol: string): Promise<Bar> {
  const res = await fetch(chartUrl(symbol), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    next: { revalidate: STOCKS_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = (await res.json()) as YahooChart;
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`${symbol}: ${json.chart?.error?.description ?? 'no result'}`);
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const times = result.timestamp ?? [];
  for (let i = closes.length - 1; i >= 0; i--) {
    const close = closes[i];
    const time = times[i];
    if (typeof close === 'number' && Number.isFinite(close) && typeof time === 'number') {
      return { close: Math.round(close * 100) / 100, time };
    }
  }
  throw new Error(`${symbol}: no close in range`);
}

const snapshot = (): StockPrices => ({
  asOf: asOfSnapshot,
  prices: Object.fromEntries(stocks.map((s) => [s.ticker, s.end])),
  source: 'snapshot',
});

/**
 * Latest close per ticker. Live where Yahoo answered, snapshot for the rest.
 * Cached by Next's data cache for an hour; safe to call at build time.
 */
export async function getStockPrices(): Promise<StockPrices> {
  try {
    const settled = await Promise.allSettled(stocks.map((s) => fetchLastClose(yahooSymbol(s.ticker))));
    const prices: Record<string, number> = {};
    let newest = 0;
    let live = 0;
    settled.forEach((r, i) => {
      const row = stocks[i];
      if (r.status === 'fulfilled') {
        prices[row.ticker] = r.value.close;
        newest = Math.max(newest, r.value.time);
        live++;
      } else {
        prices[row.ticker] = row.end;
        console.warn('[stocks] falling back to snapshot:', r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    if (live === 0) return snapshot();
    return { asOf: new Date(newest * 1000).toISOString(), prices, source: 'live' };
  } catch (err) {
    console.warn('[stocks] live fetch failed, serving snapshot:', err instanceof Error ? err.message : err);
    return snapshot();
  }
}
