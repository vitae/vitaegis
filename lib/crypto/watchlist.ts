// Server-only. The altcoin watchlist on /crypto: live price, returns and watch zones.
//
// Live price comes from the coin's Chainlink USD feed on Ethereum mainnet where one
// exists (ETH, LINK, AAVE, AVAX; checked 2026-10-02 by reading each proxy's
// description()). XRP's Ethereum feed no longer answers and QNT has none, so those two
// use Coinbase's last trade. Daily closes and the 24-hour open come from Coinbase
// Exchange's public market data for every coin: no key, and unlike CoinGecko's free
// tier it does not turn away requests from shared cloud servers.

import { latestFeeds } from './chainlink';
import { watchZones, type Zones } from './zones';

export interface WatchCoin {
  symbol: string;
  name: string;
  /** Coinbase Exchange product id. */
  product: string;
  /** Chainlink USD proxy on Ethereum mainnet. */
  feed?: string;
}

export const WATCHLIST: WatchCoin[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    product: 'ETH-USD',
    feed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },
  { symbol: 'XRP', name: 'XRP', product: 'XRP-USD' },
  { symbol: 'QNT', name: 'Quant', product: 'QNT-USD' },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    product: 'AVAX-USD',
    feed: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7',
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    product: 'AAVE-USD',
    feed: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    product: 'LINK-USD',
    feed: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  },
];

export interface WatchRow {
  symbol: string;
  name: string;
  price: number | null;
  source: 'chainlink' | 'coinbase' | 'none';
  updatedAt: number | null;
  change: { '24h': number | null; '7d': number | null; '30d': number | null; '1y': number | null };
  /** Last 90 daily closes plus the live price, oldest first. */
  spark: number[];
  zones: Zones | null;
}

const BASE = 'https://api.exchange.coinbase.com';
const DAY = 86_400;

async function coinbase<T>(path: string, revalidate: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      // Coinbase refuses requests without a User-Agent.
      headers: { Accept: 'application/json', 'User-Agent': 'vitaegis.com/crypto' },
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Coinbase ${res.status} ${path}`);
    return res.json() as Promise<T>;
  }
}

/** [time, low, high, open, close, volume], newest first. */
type Candle = [number, number, number, number, number, number];

/**
 * 366 finished daily closes, oldest first. Coinbase returns at most 300 candles per call,
 * so the year comes in two halves; today's unfinished candle is left out.
 */
async function dailyCloses(product: string, today: number): Promise<number[]> {
  const iso = (t: number) => new Date(t * 1000).toISOString();
  const span = (from: number, to: number) =>
    coinbase<Candle[]>(
      `/products/${product}/candles?granularity=86400&start=${iso(from)}&end=${iso(to)}`,
      3600,
    );
  const [recent, older] = await Promise.all([
    span(today - 250 * DAY, today - DAY),
    span(today - 366 * DAY, today - 251 * DAY),
  ]);
  const byDay = new Map<number, number>();
  for (const c of [...older, ...recent]) if (c[0] < today) byDay.set(c[0], c[4]);
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([, close]) => close);
}

interface Stats {
  open: string;
  last: string;
}

const change = (from: number | undefined, to: number | null) =>
  from && to ? ((to - from) / from) * 100 : null;

/** Never throws: a coin whose data fails shows what it has, or a dash. */
export async function getWatchlist(): Promise<WatchRow[]> {
  const today = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const withFeed = WATCHLIST.filter((c) => c.feed);
  const feeds = await latestFeeds(withFeed.map((c) => c.feed!)).catch(() =>
    withFeed.map(() => null),
  );

  return Promise.all(
    WATCHLIST.map(async (c) => {
      const [closes, stats] = await Promise.all([
        dailyCloses(c.product, today).catch((err) => {
          console.error(`watchlist ${c.symbol} history:`, err instanceof Error ? err.message : err);
          return [] as number[];
        }),
        coinbase<Stats>(`/products/${c.product}/stats`, 300).catch(() => null),
      ]);
      const live = c.feed ? feeds[withFeed.indexOf(c)] : null;
      const last = stats ? Number(stats.last) : null;
      const price = live?.answer ?? last ?? closes.at(-1) ?? null;
      const ago = (days: number) => closes.at(-days);
      return {
        symbol: c.symbol,
        name: c.name,
        price,
        source: live ? 'chainlink' : last ? 'coinbase' : 'none',
        updatedAt: live?.updatedAt ?? null,
        change: {
          '24h': change(stats ? Number(stats.open) : undefined, price),
          '7d': change(ago(7), price),
          '30d': change(ago(30), price),
          '1y': change(closes.length >= 365 ? ago(365) : undefined, price),
        },
        spark: price !== null ? [...closes.slice(-90), price] : closes.slice(-90),
        zones: price !== null && closes.length >= 30 ? watchZones(closes, price) : null,
      } satisfies WatchRow;
    }),
  );
}
