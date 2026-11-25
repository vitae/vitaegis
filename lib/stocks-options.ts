/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks, options arithmetic
   What a put, a call or 100 shares would make at a move the reader picks, and how
   often the stock has moved that far before. Everything here is arithmetic on
   quoted prices and past closes: no forecast, no model of what happens next.
   Shared by the server, which builds one `Play` per stock, and the /stocks page.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type Side = 'put' | 'call';

/** How far out of the money a strike is chosen, as a fraction of the share price. */
export const AWAY = [0, 0.05, 0.1] as const;

/** Moves by the expiry a reader can assume, in percent. */
export const MOVES = [-30, -20, -10, -5, 5, 10, 20, 30] as const;

/** With fewer past periods than this, the history columns are left blank. */
export const MIN_WINDOWS = 60;

export interface Leg {
  bid: number | null;
  ask: number | null;
  last: number | null;
}

export interface ChainRow {
  strike: number;
  call: Leg;
  put: Leg;
}

/** One expiry of one stock's options, with the share price quoted alongside. */
export interface Chain {
  /** YYYY-MM-DD */
  expiry: string;
  last: number;
  /** When the quotes are from, as Nasdaq words it. */
  asOf: string | null;
  rows: ChainRow[];
}

export interface PlayOption {
  strike: number;
  /** Per share: the asking price, or the last trade when nothing is offered. */
  cost: number;
  /** Percent move from the share price that brings the option back to its cost at the expiry. */
  needs: number;
  /** Share (0 to 1) of past periods of the same length that finished beyond `needs`. */
  paidBefore: number | null;
}

export interface Play {
  ticker: string;
  last: number | null;
  /** A put plus a call at the nearest strike, as a percent of the share price. */
  priced: number | null;
  /** One per entry of AWAY; null where the chain has no usable quote. */
  puts: Array<PlayOption | null>;
  calls: Array<PlayOption | null>;
  /** Per move in MOVES: the share (0 to 1) of past periods that moved at least that far. */
  happened: Partial<Record<number, number>> | null;
  /** How many past periods the history columns count. */
  windows: number;
}

export interface Plays {
  /** YYYY-MM-DD */
  expiry: string;
  /** Weekdays from today to the expiry. */
  days: number;
  asOf: string | null;
  plays: Play[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** The third Friday of a month, when standard monthly options expire. `month` is 0 to 11. */
export function thirdFriday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month, 1, 12)).getUTCDay();
  return iso(new Date(Date.UTC(year, month, 1 + ((5 - first + 7) % 7) + 14, 12)));
}

/** The first monthly expiry at least `minDays` after `today` (YYYY-MM-DD). */
export function nextMonthly(today: string, minDays = 14): string {
  const start = noon(today);
  const earliest = iso(new Date(start.getTime() + minDays * 86_400_000));
  let expiry = thirdFriday(start.getUTCFullYear(), start.getUTCMonth());
  for (let i = 1; expiry < earliest; i++) {
    const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1, 12));
    expiry = thirdFriday(month.getUTCFullYear(), month.getUTCMonth());
  }
  return expiry;
}

/** Weekdays after `from` up to and including `to`. Market holidays are not taken out. */
export function weekdaysBetween(from: string, to: string): number {
  let count = 0;
  for (let d = noon(from).getTime() + 86_400_000; d <= noon(to).getTime(); d += 86_400_000) {
    const day = new Date(d).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Every return over `days` closes: closes[i + days] against closes[i], as a fraction. */
export function rollingReturns(closes: number[], days: number): number[] {
  const out: number[] = [];
  if (days < 1) return out;
  for (let i = 0; i + days < closes.length; i++) {
    if (closes[i] > 0) out.push(closes[i + days] / closes[i] - 1);
  }
  return out;
}

/** The share of `returns` at or beyond `move` (a fraction), on the side `move` points to. */
export function shareBeyond(returns: number[], move: number, down = move < 0): number {
  if (!returns.length) return 0;
  return returns.filter((r) => (down ? r <= move : r >= move)).length / returns.length;
}

/** What a buyer pays per share: the ask, or the last trade when nothing is offered. */
const buyAt = (leg: Leg) => leg.ask ?? leg.last;

/** The quoted option whose strike is nearest the share price moved `away` out of the money. */
export function pickOption(
  chain: Chain,
  side: Side,
  away: number,
): { strike: number; cost: number } | null {
  const target = chain.last * (side === 'put' ? 1 - away : 1 + away);
  let best: { strike: number; cost: number } | null = null;
  for (const row of chain.rows) {
    const cost = buyAt(row[side]);
    if (cost === null) continue;
    if (!best || Math.abs(row.strike - target) < Math.abs(best.strike - target)) {
      best = { strike: row.strike, cost };
    }
  }
  return best;
}

/** `chain` may be null (no options, or Nasdaq did not answer); `closes` are daily, oldest first. */
export function buildPlay(
  ticker: string,
  chain: Chain | null,
  closes: number[],
  days: number,
): Play {
  const returns = rollingReturns(closes, days);
  const enough = returns.length >= MIN_WINDOWS;

  const option = (side: Side, away: number): PlayOption | null => {
    const pick = chain && pickOption(chain, side, away);
    if (!chain || !pick) return null;
    const breakeven = side === 'put' ? pick.strike - pick.cost : pick.strike + pick.cost;
    const needs = (breakeven / chain.last - 1) * 100;
    return {
      ...pick,
      needs,
      paidBefore: enough ? shareBeyond(returns, needs / 100, side === 'put') : null,
    };
  };

  let priced: number | null = null;
  if (chain) {
    const both = chain.rows.filter((r) => buyAt(r.call) !== null && buyAt(r.put) !== null);
    const atm = both.sort(
      (a, b) => Math.abs(a.strike - chain.last) - Math.abs(b.strike - chain.last),
    )[0];
    if (atm) priced = (((buyAt(atm.call) ?? 0) + (buyAt(atm.put) ?? 0)) / chain.last) * 100;
  }

  return {
    ticker,
    last: chain?.last ?? (closes.length ? closes[closes.length - 1] : null),
    priced,
    puts: AWAY.map((away) => option('put', away)),
    calls: AWAY.map((away) => option('call', away)),
    happened: enough
      ? Object.fromEntries(MOVES.map((m) => [m, shareBeyond(returns, m / 100)]))
      : null,
    windows: returns.length,
  };
}

/** One contract held to the expiry, if the shares have moved `move` percent from `last` by then. */
export function optionPnl(
  side: Side,
  option: { strike: number; cost: number },
  last: number,
  move: number,
): number {
  const then = last * (1 + move / 100);
  const worth = Math.max(side === 'put' ? option.strike - then : then - option.strike, 0);
  return (worth - option.cost) * 100;
}

/** The same move on 100 shares: sold short when the move is down, bought when it is up. */
export const sharesPnl = (last: number, move: number) => Math.abs(move / 100) * last * 100;
