/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks
   Twelve tickers. `start` is the fixed Dec 31, 2025 close used for YTD; `end` is
   a snapshot that the live fetch in lib/stocks.ts overrides when it succeeds.
   The other periods' start closes only come from the live fetch.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface StockRow {
  ticker: string;
  name: string;
  /** Close on `startDate`. Fixed. */
  start: number;
  /** Close on `asOfSnapshot`. Fallback when the live fetch fails. */
  end: number;
}

/** Date of the snapshot `end` closes. */
export const asOfSnapshot = '2026-09-23';

/** Date of the `start` closes. */
export const startDate = '2025-12-31';

export const stocks: StockRow[] = [
  { ticker: 'SPY', name: 'S&P 500 ETF', start: 681.92, end: 767.81 },
  { ticker: 'QQQ', name: 'Nasdaq 100 ETF', start: 614.31, end: 741.21 },
  { ticker: 'AAPL', name: 'Apple', start: 271.86, end: 337.02 },
  { ticker: 'MSFT', name: 'Microsoft', start: 483.62, end: 500.59 },
  { ticker: 'NVDA', name: 'Nvidia', start: 186.5, end: 225.51 },
  { ticker: 'GOOGL', name: 'Alphabet', start: 313.0, end: 337.83 },
  { ticker: 'AMZN', name: 'Amazon', start: 230.82, end: 249.27 },
  { ticker: 'META', name: 'Meta', start: 660.09, end: 744.1 },
  { ticker: 'TSLA', name: 'Tesla', start: 449.72, end: 380.12 },
  { ticker: 'COIN', name: 'Coinbase', start: 226.14, end: 198.13 },
  { ticker: 'GLD', name: 'Gold ETF', start: 396.31, end: 392.88 },
  { ticker: 'BTC', name: 'Bitcoin', start: 87508.83, end: 83268.44 },
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
