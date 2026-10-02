// Server-only: everything the /crypto page shows about Bitcoin, read from Chainlink.
import { unstable_cache } from 'next/cache';
import { btcPricesAt, latestBtc, recentRounds } from './chainlink';
import { dailyCloses } from './history';
import type { RoundPoint } from './search';
import { monthlyReturns, pct, regime, sma, type DailyClose, type Regime } from './signals';

export const BTC_REVALIDATE_SECONDS = 300;

/** Daily closes to read: a year on the chart plus 200 days so its 200-day line is full. */
const DAILY_DAYS = 570;
/** About nine days of rounds at the feed's usual pace: the 1D and 1W charts. */
const INTRADAY_ROUNDS = 320;
// Calendar-year returns from here on; earlier years sit in older feed phases.
const FIRST_YEAR = 2022;
const DAY = 86_400;

export type ReturnKey = '24h' | '7d' | '30d' | 'ytd' | '1y';

export interface BtcDashboard {
  source: 'live' | 'unavailable';
  price: number | null;
  updatedAt: number | null;
  returns: { key: ReturnKey; label: string; from: number | null; pct: number | null }[];
  /** Last 365 daily closes with their 50- and 200-day averages, oldest first. */
  daily: { date: string; close: number; ma50: number | null; ma200: number | null }[];
  /** Recent feed rounds, oldest first: [unix seconds, price]. */
  intraday: [number, number][];
  months: { month: string; close: number; pct: number | null }[];
  years: { year: number; open: number | null; close: number | null; pct: number | null }[];
  regime: Regime | null;
}

const RETURN_LABELS: Record<ReturnKey, string> = {
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  ytd: 'YTD',
  '1y': '1Y',
};

const isoDate = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);

const jan1 = (y: number) => Date.UTC(y, 0, 1) / 1000;

interface History {
  closes: DailyClose[];
  /** Price at Jan 1 00:00 UTC (the prior Dec 31 close) for each year from FIRST_YEAR. */
  yearOpens: { year: number; price: number | null }[];
}

/**
 * Daily closes and year opens. Past closes never change: they are read from Supabase and
 * only days not stored yet are searched on Chainlink.
 */
async function readHistory(day: string): Promise<History> {
  // Read here rather than passed in: arguments are the cache key, and the latest round
  // changes every few minutes.
  const latest = await latestBtc();
  const today = Date.parse(`${day}T00:00:00Z`) / 1000;
  const thisYear = Number(day.slice(0, 4));
  const recent = Array.from({ length: DAILY_DAYS }, (_, k) =>
    isoDate(today - (DAILY_DAYS - k) * DAY),
  );
  const years = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, k) => FIRST_YEAR + k);
  const yearEnds = years.map((y) => `${y - 1}-12-31`);
  const closes = await dailyCloses([...new Set([...recent, ...yearEnds])], latest);
  return {
    closes: recent.filter((d) => closes.has(d)).map((d) => ({ date: d, close: closes.get(d)! })),
    yearOpens: years.map((year, i) => ({ year, price: closes.get(yearEnds[i]) ?? null })),
  };
}

const cachedHistory = unstable_cache(readHistory, ['btc-history-v1'], { revalidate: DAY });

export async function getBtcDashboard(): Promise<BtcDashboard> {
  const empty: BtcDashboard = {
    source: 'unavailable',
    price: null,
    updatedAt: null,
    returns: [],
    daily: [],
    intraday: [],
    months: [],
    years: [],
    regime: null,
  };
  try {
    const latest = await latestBtc();
    const now = Math.floor(Date.now() / 1000);
    const day = isoDate(now);
    const thisYear = Number(day.slice(0, 4));
    const returnTimes: Record<ReturnKey, number> = {
      '24h': now - DAY,
      '7d': now - 7 * DAY,
      '30d': now - 30 * DAY,
      ytd: jan1(thisYear),
      '1y': now - 365 * DAY,
    };
    const keys = Object.keys(returnTimes) as ReturnKey[];

    const [history, returnPts, intraday] = await Promise.all([
      cachedHistory(day),
      btcPricesAt(
        keys.map((k) => returnTimes[k]),
        latest,
      ),
      recentRounds(INTRADAY_ROUNDS, latest),
    ]);

    const { closes, yearOpens } = history;
    const values = closes.map((c) => c.close);
    const ma50 = sma(values, 50);
    const ma200 = sma(values, 200);
    const daily = closes.map((c, i) => ({ ...c, ma50: ma50[i], ma200: ma200[i] })).slice(-365);

    return {
      source: 'live',
      price: latest.answer,
      updatedAt: latest.updatedAt,
      returns: keys.map((k, i) => ({
        key: k,
        label: RETURN_LABELS[k],
        from: returnPts[i]?.answer ?? null,
        pct: pct(returnPts[i]?.answer, latest.answer),
      })),
      daily,
      intraday: intraday.map((p: RoundPoint) => [p.updatedAt, p.answer] as [number, number]),
      months: monthlyReturns(closes).slice(-13).slice(1),
      years: yearOpens.map(({ year, price: open }, i) => {
        const close = i + 1 < yearOpens.length ? yearOpens[i + 1].price : latest.answer;
        return { year, open, close, pct: pct(open, close) };
      }),
      regime: values.length >= 200 ? regime(values, latest.answer) : null,
    };
  } catch (err) {
    console.error('Chainlink BTC read failed:', err instanceof Error ? err.message : err);
    return empty;
  }
}
