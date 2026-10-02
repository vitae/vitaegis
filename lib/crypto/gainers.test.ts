import { describe, expect, it } from 'vitest';
import { toCoins, topGainers } from './gainers';

const raw = (symbol: string, name: string, d: number, extra: Record<string, unknown> = {}) => ({
  id: symbol,
  symbol,
  name,
  current_price: 1,
  market_cap_rank: 1,
  total_volume: 5_000_000,
  price_change_percentage_24h_in_currency: d,
  price_change_percentage_7d_in_currency: d * 2,
  price_change_percentage_30d_in_currency: null,
  price_change_percentage_1y_in_currency: d * 10,
  ...extra,
});

describe('toCoins', () => {
  it('drops stablecoins, wrapped and staked tokens, and thin markets', () => {
    const coins = toCoins([
      raw('btc', 'Bitcoin', 3),
      raw('usdt', 'Tether', 0.1),
      raw('wbtc', 'Wrapped Bitcoin', 3),
      raw('steth', 'Lido Staked Ether', 2),
      raw('tiny', 'Tiny', 90, { total_volume: 10_000 }),
    ]);
    expect(coins.map((c) => c.symbol)).toEqual(['BTC']);
  });
});

describe('topGainers', () => {
  const coins = toCoins([raw('a', 'A', 5), raw('b', 'B', 50), raw('c', 'C', -4)]);

  it('ranks by the chosen window, biggest first', () => {
    expect(topGainers(coins, '24h').map((c) => c.symbol)).toEqual(['B', 'A', 'C']);
    expect(topGainers(coins, '24h', 1).map((c) => c.symbol)).toEqual(['B']);
  });

  it('leaves out coins with no figure for the window', () => {
    expect(topGainers(coins, '30d')).toEqual([]);
  });
});
