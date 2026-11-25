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
  { key: 'metals', label: 'Gold, Silver & Copper' },
  { key: 'uranium', label: 'Uranium' },
  { key: 'space', label: 'Space' },
  { key: 'core', label: 'Core Picks' },
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
  { ticker: 'BTC', name: 'Bitcoin', group: 'market', asset: 'crypto', start: 87559.9, end: 83931.7 },

  // Big Tech
  { ticker: 'AAPL', name: 'Apple', group: 'tech', asset: 'stocks', start: 271.86, end: 337.02 },
  { ticker: 'MSFT', name: 'Microsoft', group: 'tech', asset: 'stocks', start: 483.62, end: 500.59 },
  { ticker: 'GOOGL', name: 'Alphabet', group: 'tech', asset: 'stocks', start: 313.0, end: 337.83 },
  { ticker: 'AMZN', name: 'Amazon', group: 'tech', asset: 'stocks', start: 230.82, end: 249.27 },
  { ticker: 'META', name: 'Meta', group: 'tech', asset: 'stocks', start: 660.09, end: 744.1 },
  { ticker: 'TSLA', name: 'Tesla', group: 'tech', asset: 'stocks', start: 449.72, end: 380.12 },
  { ticker: 'COIN', name: 'Coinbase', group: 'tech', asset: 'stocks', start: 226.14, end: 198.13 },
  { ticker: 'CSCO', name: 'Cisco', group: 'tech', asset: 'stocks', start: 77.03, end: 106.43 },
  { ticker: 'ORCL', name: 'Oracle', group: 'tech', asset: 'stocks', start: 194.91, end: 144.56 },
  { ticker: 'NFLX', name: 'Netflix', group: 'tech', asset: 'stocks', start: 93.76, end: 71.36 },
  { ticker: 'PLTR', name: 'Palantir', group: 'tech', asset: 'stocks', start: 177.75, end: 191.79 },
  { ticker: 'PANW', name: 'Palo Alto Networks', group: 'tech', asset: 'stocks', start: 184.2, end: 393.3 },
  // Listed Nov 19, 2026: `start` is the IPO price and `end` the Nov 24, 2026 close.
  { ticker: 'ANT', name: 'Anthropic', group: 'tech', asset: 'stocks', start: 83, end: 81.91 },

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
  { ticker: 'ADI', name: 'Analog Devices', group: 'chips', asset: 'stocks', start: 271.2, end: 385.23 },
  { ticker: 'NXPI', name: 'NXP', group: 'chips', asset: 'stocks', start: 217.06, end: 235.44 },
  { ticker: 'ON', name: 'ON Semi', group: 'chips', asset: 'stocks', start: 54.15, end: 74.1 },
  { ticker: 'MCHP', name: 'Microchip', group: 'chips', asset: 'stocks', start: 63.72, end: 75.53 },
  { ticker: 'MPWR', name: 'Monolithic Power', group: 'chips', asset: 'stocks', start: 906.36, end: 1355.47 },
  { ticker: 'GFS', name: 'GlobalFoundries', group: 'chips', asset: 'stocks', start: 34.92, end: 46.42 },
  { ticker: 'TER', name: 'Teradyne', group: 'chips', asset: 'stocks', start: 193.56, end: 389.14 },
  { ticker: 'SNPS', name: 'Synopsys', group: 'chips', asset: 'stocks', start: 469.72, end: 413.06 },
  { ticker: 'CDNS', name: 'Cadence', group: 'chips', asset: 'stocks', start: 312.58, end: 309.09 },
  { ticker: 'SOXX', name: 'iShares Semi ETF', group: 'chips', asset: 'etf', start: 301.15, end: 565.72 },

  // Memory, storage and servers
  { ticker: 'SNDK', name: 'Sandisk', group: 'hardware', asset: 'stocks', start: 237.38, end: 1816.57 },
  { ticker: 'MU', name: 'Micron', group: 'hardware', asset: 'stocks', start: 285.41, end: 1071.88 },
  { ticker: 'WDC', name: 'Western Digital', group: 'hardware', asset: 'stocks', start: 172.27, end: 473.69 },
  { ticker: 'STX', name: 'Seagate', group: 'hardware', asset: 'stocks', start: 275.39, end: 923.86 },
  { ticker: 'DELL', name: 'Dell', group: 'hardware', asset: 'stocks', start: 125.88, end: 549.83 },
  { ticker: 'HPE', name: 'HP Enterprise', group: 'hardware', asset: 'stocks', start: 24.02, end: 62.33 },
  { ticker: 'SMCI', name: 'Supermicro', group: 'hardware', asset: 'stocks', start: 29.27, end: 41.44 },

  // Gold, silver and copper: the metals, then the miners
  { ticker: 'GLD', name: 'Gold ETF', group: 'metals', asset: 'etf', start: 396.31, end: 392.88 },
  { ticker: 'SLV', name: 'Silver ETF', group: 'metals', asset: 'etf', start: 64.42, end: 58.16 },
  { ticker: 'CPER', name: 'Copper ETF', group: 'metals', asset: 'etf', start: 34.96, end: 40.61 },
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
  { ticker: 'TMQ', name: 'Trilogy Metals (Alaska)', group: 'metals', asset: 'stocks', start: 4.31, end: 3.31 },
  { ticker: 'NAK', name: 'Northern Dynasty (Pebble)', group: 'metals', asset: 'stocks', start: 1.97, end: 1.41 },
  { ticker: 'PAAS', name: 'Pan American Silver', group: 'metals', asset: 'stocks', start: 51.81, end: 48.11 },
  { ticker: 'SIL', name: 'Silver Miners ETF', group: 'metals', asset: 'etf', start: 83.52, end: 92.22 },
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

  // Space. SPCX listed Jun 12, 2026: `start` is its IPO price.
  { ticker: 'SPCX', name: 'SpaceX', group: 'space', asset: 'stocks', start: 135, end: 148.36 },
  { ticker: 'ASTS', name: 'AST SpaceMobile', group: 'space', asset: 'stocks', start: 72.63, end: 59.98 },

  // Core picks: compounders across finance, payments, health, retail and AI power
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', group: 'core', asset: 'stocks', start: 502.65, end: 507.17 },
  { ticker: 'JPM', name: 'JPMorgan Chase', group: 'core', asset: 'stocks', start: 322.22, end: 337.53 },
  { ticker: 'V', name: 'Visa', group: 'core', asset: 'stocks', start: 350.71, end: 361.52 },
  { ticker: 'LLY', name: 'Eli Lilly', group: 'core', asset: 'stocks', start: 1074.68, end: 1150.99 },
  { ticker: 'COST', name: 'Costco', group: 'core', asset: 'stocks', start: 862.34, end: 904.7 },
  { ticker: 'CEG', name: 'Constellation Energy', group: 'core', asset: 'stocks', start: 353.27, end: 263.88 },
  { ticker: 'VST', name: 'Vistra', group: 'core', asset: 'stocks', start: 161.33, end: 137.97 },
];

/* ─── Paper portfolio ────────────────────────────────────────────────────────── */

export interface PaperPosition {
  /** Must also be in `stocks`, which is what the price fetch reads. */
  ticker: string;
  /** TradingView symbol, with its exchange. */
  chart: string;
  /** Share of the capital in parts of the whole: equal parts are equal weights. */
  parts: number;
  /** Paper fill: the close on the day the portfolio opened. */
  entry: number;
  /** Analysts' average 12-month price target when the portfolio opened, for reference. */
  target?: number;
}

export interface PaperPortfolio {
  /** Date of the entry closes (YYYY-MM-DD). Tracking starts with the next close. */
  opened: string;
  capital: number;
  /** How the weights were set, in a sentence or two shown under the positions. */
  weighting?: string;
  positions: PaperPosition[];
}

/** Weight by how far the target sits above the entry; a target at or under it gets nothing. */
const byTarget = (p: Omit<PaperPosition, 'parts'> & { target: number }): PaperPosition => ({
  ...p,
  parts: Math.max(0, p.target / p.entry - 1),
});

/**
 * No real orders: $10,000 at the Nov 24, 2026 closes, tracked on /stocks. Each position's
 * weight is in proportion to the gap between its entry and the analysts' average 12-month
 * price target, as published between Nov 6 and Nov 24, 2026. DELL's predates its Nov 24
 * earnings; ANT's is from the thirteen firms covering it four days after its listing.
 */
// prettier-ignore
export const paper: PaperPortfolio = {
  opened: '2026-11-24',
  capital: 10_000,
  weighting:
    "Each weight is in proportion to how far analysts' average 12-month price target sat above the entry price. A target is an opinion, not a forecast.",
  positions: [
    { ticker: 'AMD', chart: 'NASDAQ:AMD', entry: 413.27, target: 640.11 },
    { ticker: 'NVDA', chart: 'NASDAQ:NVDA', entry: 155.38, target: 229.33 },
    { ticker: 'ORCL', chart: 'NYSE:ORCL', entry: 109.5, target: 235.77 },
    { ticker: 'ANT', chart: 'NASDAQ:ANT', entry: 81.91, target: 135.3 },
    { ticker: 'DELL', chart: 'NYSE:DELL', entry: 295.28, target: 589.32 },
    { ticker: 'MU', chart: 'NASDAQ:MU', entry: 629.79, target: 1561.91 },
    { ticker: 'PLTR', chart: 'NASDAQ:PLTR', entry: 161.18, target: 218 },
    { ticker: 'PANW', chart: 'NASDAQ:PANW', entry: 352.99, target: 408.45 },
    { ticker: 'TSM', chart: 'NYSE:TSM', entry: 349.2, target: 587 },
    { ticker: 'TSLA', chart: 'NASDAQ:TSLA', entry: 384.68, target: 403.86 },
    { ticker: 'SPCX', chart: 'NASDAQ:SPCX', entry: 125.81, target: 243.64 },
    { ticker: 'ASTS', chart: 'NASDAQ:ASTS', entry: 23.6, target: 63.35 },
  ].map(byTarget),
};

/** /stocks shows one portfolio per size: the same positions, weights and entry closes in each. */
export const papers: PaperPortfolio[] = [10_000, 5_000, 1_000].map((capital) => ({
  ...paper,
  capital,
}));

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
export const yahooSymbol = (ticker: string) =>
  ticker === 'BTC' ? 'BTC-USD' : ticker.replace('.', '-'); // BRK.B → BRK-B
