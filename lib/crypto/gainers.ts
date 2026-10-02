// Biggest gainers across the top 250 coins by market cap, from CoinGecko's free API.
// Chainlink only publishes feeds for a few dozen assets and has no market-wide ranking,
// so the leaderboard comes from here; Bitcoin's own price comes from Chainlink.

export type GainWindow = '24h' | '7d' | '30d' | '1y';

export const WINDOWS: { key: GainWindow; label: string; long: string }[] = [
  { key: '24h', label: 'Day', long: '24 hours' },
  { key: '7d', label: 'Week', long: '7 days' },
  { key: '30d', label: 'Month', long: '30 days' },
  { key: '1y', label: 'Year', long: '1 year' },
];

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  rank: number | null;
  volume: number;
  change: Partial<Record<GainWindow, number>>;
}

export interface Gainers {
  asOf: string;
  lists: Record<GainWindow, Coin[]>;
  source: 'live' | 'unavailable';
}

const URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h,7d,30d,1y';

/** Pegged and wrapped tokens track something else, so a "gain" there is noise. */
const STABLES = new Set([
  'usdt',
  'usdc',
  'dai',
  'fdusd',
  'tusd',
  'usde',
  'usds',
  'pyusd',
  'usdd',
  'frax',
  'busd',
  'usd1',
  'rlusd',
  'usdtb',
  'gusd',
  'lusd',
  'susde',
  'eurc',
  'usdg',
  'usdx',
  'crvusd',
  'gho',
  'bfusd',
  'usd0',
  'usdf',
  'buidl',
  'usyc',
  'ousg',
  'xaut',
  'paxg',
]);
const DERIVATIVE = /\b(wrapped|staked|bridged|restaked|liquid staking|binance-peg)\b/i;
const MIN_VOLUME = 1_000_000;

interface Raw {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
}

export function toCoins(raw: Raw[]): Coin[] {
  return raw
    .filter(
      (c) =>
        c.current_price &&
        (c.total_volume ?? 0) >= MIN_VOLUME &&
        !STABLES.has(c.symbol.toLowerCase()) &&
        !DERIVATIVE.test(c.name),
    )
    .map((c) => {
      const change: Partial<Record<GainWindow, number>> = {};
      const put = (k: GainWindow, v: number | null | undefined) => {
        if (typeof v === 'number' && Number.isFinite(v)) change[k] = v;
      };
      put('24h', c.price_change_percentage_24h_in_currency);
      put('7d', c.price_change_percentage_7d_in_currency);
      put('30d', c.price_change_percentage_30d_in_currency);
      put('1y', c.price_change_percentage_1y_in_currency);
      return {
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price!,
        rank: c.market_cap_rank,
        volume: c.total_volume ?? 0,
        change,
      };
    });
}

export function topGainers(coins: Coin[], window: GainWindow, n = 10): Coin[] {
  return coins
    .filter((c) => c.change[window] !== undefined)
    .sort((a, b) => b.change[window]! - a.change[window]!)
    .slice(0, n);
}

export const GAINERS_REVALIDATE_SECONDS = 900;

/** Never throws: if CoinGecko is down the lists come back empty. */
export async function getGainers(): Promise<Gainers> {
  const empty = { '24h': [], '7d': [], '30d': [], '1y': [] };
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    const res = await fetch(URL, {
      headers,
      next: { revalidate: GAINERS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const coins = toCoins((await res.json()) as Raw[]);
    return {
      asOf: new Date().toISOString(),
      lists: {
        '24h': topGainers(coins, '24h'),
        '7d': topGainers(coins, '7d'),
        '30d': topGainers(coins, '30d'),
        '1y': topGainers(coins, '1y'),
      },
      source: 'live',
    };
  } catch (err) {
    console.error('gainers unavailable:', err instanceof Error ? err.message : err);
    return { asOf: new Date().toISOString(), lists: empty, source: 'unavailable' };
  }
}
