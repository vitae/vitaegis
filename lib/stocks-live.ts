// Server-only: called from /api/stocks/live. Never import from a client component.
import { paper } from '@/app/stocks/data';
import { NASDAQ_HEADERS, parseNasdaqNumber } from '@/lib/stocks';
import type { LiveQuote, LiveQuotes } from '@/lib/stocks-portfolio';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks, live
   The paper portfolio's tickers at Nasdaq's latest regular-session prices. While
   the market is open that is each ticker's last sale, all twelve in one request.
   Otherwise it is each ticker's last official close, which Nasdaq's quote API has
   hours before its history API does. Pre-market and after-hours trades are left
   out, so a day ends at the same price the daily log later prints.
   Never throws: with Nasdaq unreachable the answer has no quotes and /stocks
   keeps showing daily closes.
   ═══════════════════════════════════════════════════════════════════════════════ */

const API = 'https://api.nasdaq.com/api/quote';
const TIMEOUT_MS = 6_000;
/** A close does not change once it is set; ask again only this often. */
const CLOSE_REVALIDATE_SECONDS = 900;

interface WatchlistRow {
  symbol?: string;
  lastSalePrice?: string;
  /** When the answer was made, in New York time: "2026-11-25T11:52:42.2443278-05:00". */
  lastTradeTimestampDateTime?: string;
  marketStatus?: string;
}

export interface Watchlist {
  data?: WatchlistRow[] | null;
}

interface InfoQuote {
  lastSalePrice?: string;
  /** "Nov 25, 2026 11:52 AM ET" while trading, "Closed at Nov 24, 2026 4:00 PM ET" for a close. */
  lastTradeTimestamp?: string;
}

export interface Info {
  data?: { primaryData?: InfoQuote | null; secondaryData?: InfoQuote | null } | null;
}

/** `revalidate` in seconds keeps the answer in Next's data cache; without it every call is fresh. */
async function getJson<T>(url: string, revalidate?: number): Promise<T> {
  const res = await fetch(url, {
    headers: NASDAQ_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' as const }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Each ticker's last sale, or null unless the answer says the regular session is trading. */
export function parseWatchlist(json: Watchlist): Record<string, LiveQuote> | null {
  const rows = json.data ?? [];
  if (!rows.some((r) => /^(market )?open$/i.test(r.marketStatus ?? ''))) return null;
  const quotes: Record<string, LiveQuote> = {};
  for (const row of rows) {
    const price = parseNasdaqNumber(row.lastSalePrice);
    const date = (row.lastTradeTimestampDateTime ?? '').slice(0, 10);
    if (row.symbol && price > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      quotes[row.symbol.toUpperCase()] = { date, price };
    }
  }
  return quotes;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The price Nasdaq labels "Closed at <date>", with that date; null if the answer has none. */
export function parseClose(json: Info): LiveQuote | null {
  for (const quote of [json.data?.primaryData, json.data?.secondaryData]) {
    const m = /closed at ([A-Z][a-z]{2})[a-z]* (\d{1,2}), (\d{4})/i.exec(
      quote?.lastTradeTimestamp ?? '',
    );
    if (!m) continue;
    const month = MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase());
    const price = parseNasdaqNumber(quote?.lastSalePrice);
    if (month < 0 || !(price > 0)) continue;
    return {
      date: `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`,
      price,
    };
  }
  return null;
}

export async function getLiveQuotes(): Promise<LiveQuotes> {
  const at = new Date().toISOString();
  const tickers = paper.positions.map((p) => p.ticker);
  try {
    const symbols = tickers.map((t) => `symbol=${encodeURIComponent(`${t.toLowerCase()}|stocks`)}`);
    const open = parseWatchlist(await getJson<Watchlist>(`${API}/watchlist?${symbols.join('&')}`));
    if (open) return { session: 'open', at, quotes: open };

    const settled = await Promise.allSettled(
      tickers.map((t) =>
        getJson<Info>(
          `${API}/${encodeURIComponent(t)}/info?assetclass=stocks`,
          CLOSE_REVALIDATE_SECONDS,
        ),
      ),
    );
    const quotes: Record<string, LiveQuote> = {};
    settled.forEach((r, i) => {
      const close = r.status === 'fulfilled' ? parseClose(r.value) : null;
      if (close) quotes[tickers[i]] = close;
    });
    return { session: 'closed', at, quotes };
  } catch (err) {
    console.warn('[stocks] live quotes unavailable:', err instanceof Error ? err.message : err);
    return { session: 'closed', at, quotes: {} };
  }
}
