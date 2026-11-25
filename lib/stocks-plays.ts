// Server-only: called from the /stocks page. Never import from a client component.
import { paper } from '@/app/stocks/data';
import { getSeries, NASDAQ_HEADERS } from '@/lib/stocks';
import { nasdaqDate } from '@/lib/stocks-live';
import {
  buildPlay,
  nextMonthly,
  weekdaysBetween,
  type Chain,
  type ChainRow,
  type Leg,
  type Plays,
} from '@/lib/stocks-options';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks, plays
   For each paper portfolio ticker: Nasdaq's option quotes for the next monthly
   expiry and the stock's own daily closes, reduced to the handful of numbers the
   plays table on /stocks shows. One option-chain request per ticker, kept for ten
   minutes. Never throws: a ticker Nasdaq does not answer for gets a row of dashes.
   ═══════════════════════════════════════════════════════════════════════════════ */

const API = 'https://api.nasdaq.com/api/quote';
const TIMEOUT_MS = 8_000;
const CHAIN_REVALIDATE_SECONDS = 600;

interface RawRow {
  /** "December 18, 2026" on the row that opens an expiry; empty on the strikes under it. */
  expirygroup?: string | null;
  strike?: string | null;
  c_Last?: string | null;
  c_Bid?: string | null;
  c_Ask?: string | null;
  p_Last?: string | null;
  p_Bid?: string | null;
  p_Ask?: string | null;
}

export interface RawChain {
  data?: {
    /** "LAST TRADE: $143.89 (AS OF NOV 25, 2026 12:29 PM ET)" */
    lastTrade?: string | null;
    table?: { rows?: RawRow[] | null } | null;
  } | null;
}

/** "9.40" → 9.4; "--", "0.00" and nothing → null. */
const price = (s: string | null | undefined) => {
  const n = Number((s ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const leg = (bid?: string | null, ask?: string | null, last?: string | null): Leg => ({
  bid: price(bid),
  ask: price(ask),
  last: price(last),
});

/** The latest expiry in an option-chain answer; null without a share price or any strikes. */
export function parseChain(json: RawChain): Chain | null {
  const last = price(/\$([\d,.]+)/.exec(json.data?.lastTrade ?? '')?.[1]);
  const stamp = /as of ([^)]+)/i.exec(json.data?.lastTrade ?? '')?.[1].trim() ?? null;
  const byExpiry = new Map<string, ChainRow[]>();
  let expiry: string | null = null;
  for (const row of json.data?.table?.rows ?? []) {
    if (row.expirygroup) expiry = nasdaqDate(row.expirygroup);
    const strike = price(row.strike);
    if (!expiry || strike === null) continue;
    const rows = byExpiry.get(expiry) ?? [];
    rows.push({
      strike,
      call: leg(row.c_Bid, row.c_Ask, row.c_Last),
      put: leg(row.p_Bid, row.p_Ask, row.p_Last),
    });
    byExpiry.set(expiry, rows);
  }
  const latest = [...byExpiry.keys()].sort().pop();
  if (last === null || !latest) return null;
  return {
    expiry: latest,
    last,
    // "NOV 25, 2026 12:29 PM ET" → "Nov 25, 2026 12:29 PM ET"
    asOf: stamp && stamp.charAt(0) + stamp.slice(1, 3).toLowerCase() + stamp.slice(3),
    rows: byExpiry.get(latest) ?? [],
  };
}

async function fetchChain(ticker: string, expiry: string): Promise<Chain | null> {
  // A monthly expiry falls a day early when its Friday is a market holiday.
  const from = new Date(Date.parse(`${expiry}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(
    `${API}/${encodeURIComponent(ticker)}/option-chain?assetclass=stocks&limit=1000&fromdate=${from}&todate=${expiry}&excode=oprac&callput=callput&money=all&type=all`,
    {
      headers: NASDAQ_HEADERS,
      next: { revalidate: CHAIN_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseChain((await res.json()) as RawChain);
}

const newYorkDate = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);

export async function getPlays(now = new Date()): Promise<Plays> {
  const today = newYorkDate(now);
  const expiry = nextMonthly(today);
  const days = weekdaysBetween(today, expiry);
  const built = await Promise.all(
    paper.positions.map(async ({ ticker }) => {
      const [chain, series] = await Promise.all([
        fetchChain(ticker, expiry).catch((err: unknown) => {
          console.warn(
            `[stocks] no option chain for ${ticker}:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }),
        getSeries(ticker),
      ]);
      return { chain, play: buildPlay(ticker, chain, series?.closes ?? [], days) };
    }),
  );
  const quoted = built.find((b) => b.chain)?.chain;
  return {
    // The date Nasdaq lists, which is a day early when the Friday is a holiday.
    expiry: quoted?.expiry ?? expiry,
    days,
    asOf: quoted?.asOf ?? null,
    plays: built.map((b) => b.play),
  };
}
