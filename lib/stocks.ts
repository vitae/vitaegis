// Server-only: called from the /stocks page and /api/stocks route. Never import from a client component.
import {
  asOfSnapshot,
  startDate,
  stocks,
  yahooSymbol,
  type PeriodKey,
  type StockRow,
} from '@/app/stocks/data';
import { closeOnOrBefore, LOOKBACK_KEYS, referenceFor, type Series } from '@/lib/stocks-periods';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks
   Latest daily close for each ticker in app/stocks/data.ts, plus the close each
   period (1D … 5Y) compares against. Five years and two weeks of daily closes
   per ticker, one request each, from Nasdaq's quote API; Yahoo Finance's chart
   API (ten years, its nearest range that covers 5Y) is the backup for any
   ticker Nasdaq fails. Shared by the /stocks page and
   /api/stocks so Next's data cache serves both from the same hourly fetch.
   Never throws: a ticker both sources fail gets its snapshot close and YTD
   start; if every ticker fails, `source` is 'snapshot'.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const STOCKS_REVALIDATE_SECONDS = 3600;

export type StockSource = 'live' | 'snapshot';

export interface StockPrices {
  /** ISO timestamp of the newest stock bar (crypto only if no stock was live), or `asOfSnapshot`. */
  asOf: string;
  prices: Record<string, number>;
  /** Start close per ticker per period. `ytd` is always present; a missing key means no data. */
  starts: Record<string, Partial<Record<PeriodKey, number>>>;
  /** ISO date (YYYY-MM-DD) each period starts from, taken from the first live stock. */
  startDates: Partial<Record<PeriodKey, string>>;
  source: StockSource;
}

// Both APIs answer bots with 403/429 or hang; send what a browser sends and give up after 8s.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const TIMEOUT_MS = 8_000;
// Tickers fetched at once. ~80 tickers at 16 wide takes a few seconds.
const CONCURRENCY = 16;
// After this many Nasdaq failures in one refresh, the remaining tickers go straight to Yahoo,
// so a Nasdaq outage costs one timeout rather than one per ticker.
const NASDAQ_MAX_FAILURES = 3;

/** Nasdaq history: 5Y plus two weeks, so 5Y still has a bar when its date falls on a holiday. */
const NASDAQ_HISTORY_DAYS = 5 * 366 + 14;

/** Four decimals: enough for sub-dollar split-adjusted history, exact for cents. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

const isoDate = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
    next: { revalidate: STOCKS_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/* ─── Nasdaq ─────────────────────────────────────────────────────────────────── */

interface NasdaqHistory {
  data?: {
    tradesTable?: { rows?: Array<{ date?: string; close?: string }> | null } | null;
  } | null;
  status?: { bCodeMessage?: Array<{ errorMessage?: string }> | null };
}

/** "$1,816.57" → 1816.57 */
const parseNasdaqNumber = (s: string | undefined) => Number((s ?? '').replace(/[$,]/g, ''));

/** "09/23/2026" → Unix seconds at noon UTC, so the date reads the same in US time zones. */
function parseNasdaqDate(s: string | undefined): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? '');
  return m ? Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), 12) / 1000 : NaN;
}

/** `fromdate` moves daily, so the cache key does too; `todate` is a fixed year-end. */
function nasdaqUrl(row: StockRow): string {
  const now = new Date();
  const from = isoDate(now.getTime() / 1000 - NASDAQ_HISTORY_DAYS * 86_400);
  const to = `${now.getUTCFullYear()}-12-31`;
  return `https://api.nasdaq.com/api/quote/${encodeURIComponent(row.ticker)}/historical?assetclass=${row.asset}&fromdate=${from}&todate=${to}&limit=9999`;
}

async function fetchNasdaq(row: StockRow): Promise<Series> {
  const json = await getJson<NasdaqHistory>(nasdaqUrl(row), {
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://www.nasdaq.com',
    Referer: 'https://www.nasdaq.com/',
  });
  const rows = json.data?.tradesTable?.rows;
  if (!rows?.length) {
    throw new Error(json.status?.bCodeMessage?.[0]?.errorMessage ?? 'no rows');
  }
  const series: Series = { times: [], closes: [] };
  // Newest first; walk backwards so the series is ascending.
  for (let i = rows.length - 1; i >= 0; i--) {
    const time = parseNasdaqDate(rows[i].date);
    const close = parseNasdaqNumber(rows[i].close);
    if (Number.isFinite(time) && Number.isFinite(close) && close > 0) {
      series.times.push(time);
      series.closes.push(round(close));
    }
  }
  return series;
}

/* ─── Yahoo (backup) ─────────────────────────────────────────────────────────── */

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: Array<number | null>;
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
}

async function fetchYahoo(row: StockRow): Promise<Series> {
  const symbol = encodeURIComponent(yahooSymbol(row.ticker));
  const json = await getJson<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=10y&interval=1d`,
    {},
  );
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(json.chart?.error?.description ?? 'no result');
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const times = result.timestamp ?? [];
  const series: Series = { times: [], closes: [] };
  closes.forEach((close, i) => {
    const time = times[i];
    if (typeof close === 'number' && Number.isFinite(close) && typeof time === 'number') {
      series.times.push(time);
      series.closes.push(round(close));
    }
  });
  return series;
}

/* ─── Combined ───────────────────────────────────────────────────────────────── */

/** Per-refresh count of Nasdaq failures, shared by every ticker in one `getStockPrices` call. */
interface Breaker {
  nasdaqFailures: number;
}

/** Nasdaq (unless the breaker is open), then Yahoo. Throws only when both fail or return nothing. */
async function fetchSeries(row: StockRow, breaker: Breaker): Promise<Series> {
  const errors: string[] = [];
  const sources = [
    ['nasdaq', fetchNasdaq],
    ['yahoo', fetchYahoo],
  ] as const;
  for (const [name, fetcher] of sources) {
    if (name === 'nasdaq' && breaker.nasdaqFailures >= NASDAQ_MAX_FAILURES) {
      errors.push('nasdaq: skipped after repeated failures');
      continue;
    }
    try {
      const series = await fetcher(row);
      if (series.times.length > 0) return series;
      errors.push(`${name}: no closes`);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (name === 'nasdaq') breaker.nasdaqFailures++;
  }
  throw new Error(`${row.ticker}: ${errors.join('; ')}`);
}

/** Like Promise.allSettled over `items`, at most `limit` at a time. */
async function settleAll<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
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

/** End of the YTD start day, in Unix seconds. */
const YTD_CUTOFF = Date.parse(`${startDate}T23:59:59Z`) / 1000;

/**
 * Latest close and period start closes per ticker. Live where Nasdaq or Yahoo
 * answered; a ticker both fail gets its snapshot close and YTD start only.
 * Cached by Next's data cache for an hour; safe to call at build time.
 */
export async function getStockPrices(): Promise<StockPrices> {
  try {
    const breaker: Breaker = { nasdaqFailures: 0 };
    const settled = await settleAll(stocks, CONCURRENCY, (row) => fetchSeries(row, breaker));
    const prices: Record<string, number> = {};
    const starts = ytdStarts();
    const startDates: StockPrices['startDates'] = { ytd: startDate };
    let datesFrom = '';
    // Newest stock bar; crypto trades daily and posts today's bar before stocks close.
    let newest = 0;
    let newestCrypto = 0;
    let live = 0;
    settled.forEach((r, i) => {
      const row = stocks[i];
      if (r.status === 'fulfilled') {
        const series = r.value;
        const last = series.times.length - 1;
        prices[row.ticker] = series.closes[last];
        if (row.asset === 'crypto') newestCrypto = Math.max(newestCrypto, series.times[last]);
        else newest = Math.max(newest, series.times[last]);
        live++;
        const ytd = closeOnOrBefore(series, YTD_CUTOFF);
        if (ytd) starts[row.ticker].ytd = ytd.close;
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
      asOf: new Date((newest || newestCrypto) * 1000).toISOString(),
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
