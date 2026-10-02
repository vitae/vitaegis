// Server-only. The altcoin watchlist on /crypto: live price, returns and watch zones.
//
// Live price comes from the coin's Chainlink USD feed on Ethereum mainnet where one
// exists (ETH, LINK, AAVE, AVAX; checked 2026-10-02 by reading each proxy's
// description()). XRP's Ethereum feed no longer answers and QNT has none, so those two
// use CoinGecko. Returns and the year of daily closes behind the zones come from CoinGecko
// for every coin.

import { latestFeeds } from './chainlink';
import { watchZones, type Zones } from './zones';

export interface WatchCoin {
  symbol: string;
  name: string;
  gecko: string;
  /** Chainlink USD proxy on Ethereum mainnet. */
  feed?: string;
}

export const WATCHLIST: WatchCoin[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    gecko: 'ethereum',
    feed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },
  { symbol: 'XRP', name: 'XRP', gecko: 'ripple' },
  { symbol: 'QNT', name: 'Quant', gecko: 'quant-network' },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    gecko: 'avalanche-2',
    feed: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7',
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    gecko: 'aave',
    feed: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    gecko: 'chainlink',
    feed: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  },
];

export interface WatchRow {
  symbol: string;
  name: string;
  price: number | null;
  source: 'chainlink' | 'coingecko' | 'none';
  updatedAt: number | null;
  change: { '24h': number | null; '7d': number | null; '30d': number | null; '1y': number | null };
  /** Last 90 daily closes plus the live price, oldest first. */
  spark: number[];
  zones: Zones | null;
}

const BASE = 'https://api.coingecko.com/api/v3';
const REVALIDATE = 3600;

async function gecko<T>(path: string, revalidate: number): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  // The free tier allows a handful of calls a minute and answers bursts with 429; wait
  // and retry rather than lose a coin's chart.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, [2_000, 6_000, 15_000][attempt]));
      continue;
    }
    if (!res.ok) throw new Error(`CoinGecko ${res.status} ${path}`);
    return res.json() as Promise<T>;
  }
}

interface Market {
  id: string;
  current_price: number | null;
  last_updated: string | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
}

/** Daily closes: CoinGecko's points at 00:00 UTC, dropping the trailing "now" point. */
async function dailyCloses(id: string): Promise<number[]> {
  const json = await gecko<{ prices: [number, number][] }>(
    `/coins/${id}/market_chart?vs_currency=usd&days=365&interval=daily`,
    REVALIDATE,
  );
  return json.prices.filter(([t]) => t % 86_400_000 === 0).map(([, p]) => p);
}

/** Never throws: a coin whose data fails shows what it has, or a dash. */
export async function getWatchlist(): Promise<WatchRow[]> {
  const ids = WATCHLIST.map((c) => c.gecko).join(',');
  const withFeed = WATCHLIST.filter((c) => c.feed);

  const [markets, feeds] = await Promise.all([
    gecko<Market[]>(
      `/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d,1y`,
      300,
    ).catch((err) => {
      console.error('watchlist markets failed:', err instanceof Error ? err.message : err);
      return [] as Market[];
    }),
    latestFeeds(withFeed.map((c) => c.feed!)).catch(() => withFeed.map(() => null)),
  ]);

  // One coin at a time: the free API rate-limits bursts, and these are cached for an hour.
  const history = new Map<string, number[]>();
  for (const c of WATCHLIST) {
    try {
      history.set(c.symbol, await dailyCloses(c.gecko));
    } catch (err) {
      console.error(
        `watchlist history ${c.symbol} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return WATCHLIST.map((c) => {
    const m = markets.find((x) => x.id === c.gecko);
    const live = c.feed ? feeds[withFeed.indexOf(c)] : null;
    const price = live?.answer ?? m?.current_price ?? null;
    const source: WatchRow['source'] = live ? 'chainlink' : m?.current_price ? 'coingecko' : 'none';
    const closes = history.get(c.symbol) ?? [];
    return {
      symbol: c.symbol,
      name: c.name,
      price,
      source,
      updatedAt: live?.updatedAt ?? (m?.last_updated ? Date.parse(m.last_updated) / 1000 : null),
      change: {
        '24h': m?.price_change_percentage_24h_in_currency ?? null,
        '7d': m?.price_change_percentage_7d_in_currency ?? null,
        '30d': m?.price_change_percentage_30d_in_currency ?? null,
        '1y': m?.price_change_percentage_1y_in_currency ?? null,
      },
      spark: price !== null ? [...closes.slice(-90), price] : closes.slice(-90),
      zones: price !== null && closes.length >= 30 ? watchZones(closes, price) : null,
    };
  });
}
