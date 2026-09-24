/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks
   The tickers on /stocks, in groups. `start` is the Dec 31, 2025 close and `end`
   a saved later close; both are fallbacks that the live fetch in lib/stocks.ts
   replaces when it succeeds. Other periods' start closes only come from the
   live fetch.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const groups = [
  { key: 'market', label: 'Market' },
  { key: 'tech', label: 'Big Tech' },
  { key: 'chips', label: 'Chips' },
  { key: 'hardware', label: 'Memory & Hardware' },
  { key: 'metals', label: 'Gold & Copper' },
  { key: 'uranium', label: 'Uranium' },
] as const;

export type GroupKey = (typeof groups)[number]['key'];

/** Nasdaq's asset class for a symbol; its quote API needs the right one. */
export type AssetClass = 'stocks' | 'etf' | 'crypto';

export interface StockRow {
  ticker: string;
  name: string;
  group: GroupKey;
  asset: AssetClass;
  /** Close on `startDate`. Fallback for YTD when the live fetch fails. */
  start: number;
  /** Close on `asOfSnapshot`. Fallback when the live fetch fails. */
  end: number;
}

/** Date of the snapshot `end` closes. */
export const asOfSnapshot = '2026-09-23';

/** Date of the `start` closes. */
export const startDate = '2025-12-31';

// prettier-ignore
export const stocks: StockRow[] = [
  // Market
  { ticker: 'SPY', name: 'S&P 500 ETF', group: 'market', asset: 'etf', start: 681.92, end: 767.81 },
  { ticker: 'QQQ', name: 'Nasdaq 100 ETF', group: 'market', asset: 'etf', start: 614.31, end: 741.21 },
  { ticker: 'GLD', name: 'Gold ETF', group: 'market', asset: 'etf', start: 396.31, end: 392.88 },
  { ticker: 'BTC', name: 'Bitcoin', group: 'market', asset: 'crypto', start: 87559.9, end: 83931.7 },

  // Big Tech
  { ticker: 'AAPL', name: 'Apple', group: 'tech', asset: 'stocks', start: 271.86, end: 337.02 },
  { ticker: 'MSFT', name: 'Microsoft', group: 'tech', asset: 'stocks', start: 483.62, end: 500.59 },
  { ticker: 'GOOGL', name: 'Alphabet', group: 'tech', asset: 'stocks', start: 313.0, end: 337.83 },
  { ticker: 'AMZN', name: 'Amazon', group: 'tech', asset: 'stocks', start: 230.82, end: 249.27 },
  { ticker: 'META', name: 'Meta', group: 'tech', asset: 'stocks', start: 660.09, end: 744.1 },
  { ticker: 'TSLA', name: 'Tesla', group: 'tech', asset: 'stocks', start: 449.72, end: 380.12 },
  { ticker: 'COIN', name: 'Coinbase', group: 'tech', asset: 'stocks', start: 226.14, end: 198.13 },

  // Chips: designers, foundries, equipment
  { ticker: 'NVDA', name: 'Nvidia', group: 'chips', asset: 'stocks', start: 186.5, end: 225.51 },
  { ticker: 'AMD', name: 'AMD', group: 'chips', asset: 'stocks', start: 214.16, end: 614.61 },
  { ticker: 'INTC', name: 'Intel', group: 'chips', asset: 'stocks', start: 36.9, end: 122.6 },
  { ticker: 'TSM', name: 'TSMC', group: 'chips', asset: 'stocks', start: 303.89, end: 446.57 },
  { ticker: 'AVGO', name: 'Broadcom', group: 'chips', asset: 'stocks', start: 346.1, end: 354.99 },
  { ticker: 'QCOM', name: 'Qualcomm', group: 'chips', asset: 'stocks', start: 171.05, end: 197.24 },
  { ticker: 'ARM', name: 'Arm', group: 'chips', asset: 'stocks', start: 109.31, end: 332.56 },
  { ticker: 'MRVL', name: 'Marvell', group: 'chips', asset: 'stocks', start: 84.98, end: 260.9 },
  { ticker: 'TXN', name: 'Texas Instruments', group: 'chips', asset: 'stocks', start: 173.49, end: 272.62 },
  { ticker: 'ASML', name: 'ASML', group: 'chips', asset: 'stocks', start: 1069.86, end: 1744.61 },
  { ticker: 'AMAT', name: 'Applied Materials', group: 'chips', asset: 'stocks', start: 256.99, end: 474.38 },
  { ticker: 'LRCX', name: 'Lam Research', group: 'chips', asset: 'stocks', start: 171.18, end: 307.28 },
  { ticker: 'KLAC', name: 'KLA', group: 'chips', asset: 'stocks', start: 121.508, end: 187.86 },
  { ticker: 'SMH', name: 'Semiconductor ETF', group: 'chips', asset: 'etf', start: 360.13, end: 601.41 },
  { ticker: 'SOXX', name: 'iShares Semi ETF', group: 'chips', asset: 'etf', start: 301.15, end: 565.72 },

  // Memory, storage and servers
  { ticker: 'SNDK', name: 'Sandisk', group: 'hardware', asset: 'stocks', start: 237.38, end: 1816.57 },
  { ticker: 'MU', name: 'Micron', group: 'hardware', asset: 'stocks', start: 285.41, end: 1071.88 },
  { ticker: 'WDC', name: 'Western Digital', group: 'hardware', asset: 'stocks', start: 172.27, end: 473.69 },
  { ticker: 'STX', name: 'Seagate', group: 'hardware', asset: 'stocks', start: 275.39, end: 923.86 },
  { ticker: 'DELL', name: 'Dell', group: 'hardware', asset: 'stocks', start: 125.88, end: 549.83 },
  { ticker: 'HPE', name: 'HP Enterprise', group: 'hardware', asset: 'stocks', start: 24.02, end: 62.33 },
  { ticker: 'SMCI', name: 'Supermicro', group: 'hardware', asset: 'stocks', start: 29.27, end: 41.44 },

  // Gold and copper miners
  { ticker: 'NEM', name: 'Newmont', group: 'metals', asset: 'stocks', start: 99.85, end: 123.55 },
  { ticker: 'AEM', name: 'Agnico Eagle', group: 'metals', asset: 'stocks', start: 169.53, end: 195.57 },
  { ticker: 'B', name: 'Barrick', group: 'metals', asset: 'stocks', start: 43.55, end: 42.49 },
  { ticker: 'KGC', name: 'Kinross Gold', group: 'metals', asset: 'stocks', start: 28.16, end: 27.62 },
  { ticker: 'WPM', name: 'Wheaton Precious', group: 'metals', asset: 'stocks', start: 117.52, end: 145.45 },
  { ticker: 'FNV', name: 'Franco-Nevada', group: 'metals', asset: 'stocks', start: 207.28, end: 260.91 },
  { ticker: 'FCX', name: 'Freeport-McMoRan', group: 'metals', asset: 'stocks', start: 50.79, end: 72.58 },
  { ticker: 'SCCO', name: 'Southern Copper', group: 'metals', asset: 'stocks', start: 143.47, end: 201.94 },
  { ticker: 'TECK', name: 'Teck Resources', group: 'metals', asset: 'stocks', start: 47.89, end: 66.8 },
  { ticker: 'GDX', name: 'Gold Miners ETF', group: 'metals', asset: 'etf', start: 85.77, end: 93.56 },
  { ticker: 'COPX', name: 'Copper Miners ETF', group: 'metals', asset: 'etf', start: 71.79, end: 87.03 },

  // Uranium miners and fuel
  { ticker: 'CCJ', name: 'Cameco', group: 'uranium', asset: 'stocks', start: 91.49, end: 90.8 },
  { ticker: 'NXE', name: 'NexGen Energy', group: 'uranium', asset: 'stocks', start: 9.2, end: 9.63 },
  { ticker: 'UEC', name: 'Uranium Energy', group: 'uranium', asset: 'stocks', start: 11.68, end: 9.95 },
  { ticker: 'UUUU', name: 'Energy Fuels', group: 'uranium', asset: 'stocks', start: 14.54, end: 11.6 },
  { ticker: 'DNN', name: 'Denison Mines', group: 'uranium', asset: 'stocks', start: 2.66, end: 2.82 },
  { ticker: 'LEU', name: 'Centrus Energy', group: 'uranium', asset: 'stocks', start: 242.76, end: 151.31 },
  { ticker: 'URA', name: 'Uranium ETF', group: 'uranium', asset: 'etf', start: 42.73, end: 41.99 },
  { ticker: 'URNM', name: 'Uranium Miners ETF', group: 'uranium', asset: 'etf', start: 54.89, end: 50.62 },
];

/** Lookback periods the board can compare against. `ytd` uses the fixed `start` closes above. */
export const periods = [
  { key: '1d', label: '1D', long: '1 day' },
  { key: '1w', label: '1W', long: '1 week' },
  { key: '1m', label: '1M', long: '1 month' },
  { key: '3m', label: '3M', long: '3 months' },
  { key: '6m', label: '6M', long: '6 months' },
  { key: 'ytd', label: 'YTD', long: 'Since Dec 31, 2025' },
  { key: '1y', label: '1Y', long: '1 year' },
  { key: '5y', label: '5Y', long: '5 years' },
] as const;

export type PeriodKey = (typeof periods)[number]['key'];

export const defaultPeriod: PeriodKey = 'ytd';

/** Symbol Yahoo Finance uses for a ticker. */
export const yahooSymbol = (ticker: string) => (ticker === 'BTC' ? 'BTC-USD' : ticker);
