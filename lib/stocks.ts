// Server-only: called from the /stocks page and /api/stocks route. Never import from a client component.
import { asOfSnapshot, startDate, stocks, yahooSymbol, type PeriodKey } from '@/app/stocks/data';
import { LOOKBACK_KEYS, referenceFor, type Series } from '@/lib/stocks-periods';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks
   Latest daily close for each ticker in app/stocks/data.ts, plus the close each
   lookback period (1D … 5Y) compares against, from Yahoo Finance's public chart
   endpoint: ten years of daily bars per ticker, one request each (range=5y
   starts just after the 5Y mark, leaving no bar to compare against). Shared by
   the /stocks page and /api/stocks so Next's data cache serves both from the
   same hourly fetch. Never throws: any ticker that fails falls back to its
   snapshot close and YTD start; if all fail, `source` is 'snapshot'.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const STOCKS_REVALIDATE_SECONDS = 3600;

export type StockSource = 'live' | 'snapshot';

export interface StockPrices {
  /** ISO timestamp of the newest bar, or `asOfSnapshot` when nothing was live. */
  asOf: string;
  prices: Record<string, number>;
  /** Start close per ticker per period. `ytd` is always present; a missing key means no data. */
  starts: Record<string, Partial<Record<PeriodKey, number>>>;
  /** ISO date (YYYY-MM-DD) each period starts from, taken from the first live stock. */
  startDates: Partial<Record<PeriodKey, string>>;
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
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d`;

const cents = (n: number) => Math.round(n * 100) / 100;

const isoDate = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

/** Ten years of non-null daily closes for one symbol, rounded to cents. Throws on any failure. */
async function fetchSeries(symbol: string): Promise<Series> {
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
  const series: Series = { times: [], closes: [] };
  closes.forEach((close, i) => {
    const time = times[i];
    if (typeof close === 'number' && Number.isFinite(close) && typeof time === 'number') {
      series.times.push(time);
      series.closes.push(cents(close));
    }
  });
  if (series.times.length === 0) throw new Error(`${symbol}: no close in range`);
  return series;
}

const ytdStarts = (): StockPrices['starts'] =>
  Object.fromEntries(stocks.map((s) => [s.ticker, { ytd: s.start }]));

const snapshot = (): StockPrices => ({
  asOf: asOfSnapshot,
  prices: Object.fromEntries(stocks.map((s) => [s.ticker, s.end])),
  starts: ytdStarts(),
  startDates: { ytd: startDate },
  source: 'snapshot',
});

/**
 * Latest close and period start closes per ticker. Live where Yahoo answered;
 * failed tickers get their snapshot close and only the YTD start.
 * Cached by Next's data cache for an hour; safe to call at build time.
 */
export async function getStockPrices(): Promise<StockPrices> {
  try {
    const settled = await Promise.allSettled(stocks.map((s) => fetchSeries(yahooSymbol(s.ticker))));
    const prices: Record<string, number> = {};
    const starts = ytdStarts();
    const startDates: StockPrices['startDates'] = { ytd: startDate };
    let datesFrom = '';
    let newest = 0;
    let live = 0;
    settled.forEach((r, i) => {
      const row = stocks[i];
      if (r.status === 'fulfilled') {
        const series = r.value;
        const last = series.times.length - 1;
        prices[row.ticker] = series.closes[last];
        newest = Math.max(newest, series.times[last]);
        live++;
        // Dates come from the first live stock; Bitcoin trades weekends, so only as a last resort.
        const setDates = !datesFrom || (datesFrom === 'BTC' && row.ticker !== 'BTC');
        if (setDates) datesFrom = row.ticker;
        for (const key of LOOKBACK_KEYS) {
          const ref = referenceFor(series, key);
          if (!ref) continue;
          starts[row.ticker][key] = ref.close;
          if (setDates) startDates[key] = isoDate(ref.time);
        }
      } else {
        prices[row.ticker] = row.end;
        console.warn(
          '[stocks] falling back to snapshot:',
          r.reason instanceof Error ? r.reason.message : r.reason,
        );
      }
    });
    if (live === 0) return snapshot();
    return {
      asOf: new Date(newest * 1000).toISOString(),
      prices,
      starts,
      startDates,
      source: 'live',
    };
  } catch (err) {
    console.warn(
      '[stocks] live fetch failed, serving snapshot:',
      err instanceof Error ? err.message : err,
    );
    return snapshot();
  }
}
