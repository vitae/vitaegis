import type { PaperPortfolio } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Paper portfolio
   Marks the paper portfolio in app/stocks/data.ts to the daily closes that came
   after it opened. Each position is bought at its entry close with its share of
   the capital; on a day a ticker has no bar, its previous close carries forward.
   While a day's close is not published yet, `withLive` stands in Nasdaq's latest
   price for it.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface DailyClose {
  /** YYYY-MM-DD */
  date: string;
  close: number;
}

/** Daily closes per ticker. Only bars dated after the portfolio opened are used. */
export type PaperHistory = Record<string, DailyClose[]>;

export interface PositionState {
  ticker: string;
  /** Share of the capital, 0 to 1. */
  weight: number;
  cost: number;
  shares: number;
  entry: number;
  /** Latest close after the entry, or the entry itself before there is one. */
  last: number;
  value: number;
  pnl: number;
  pnlPct: number;
  /** Percent move on each tracked day, oldest first; null where the ticker had no bar. */
  moves: Array<number | null>;
}

export interface DayState {
  date: string;
  value: number;
  /** Against the day before; the first day is against the capital. */
  change: number;
  changePct: number;
  /** Against the capital. */
  total: number;
  totalPct: number;
}

export interface PortfolioState {
  capital: number;
  value: number;
  pnl: number;
  pnlPct: number;
  positions: PositionState[];
  /** Trading days after the entry, oldest first. */
  days: DayState[];
}

/** One ticker's latest regular-session price and the New York date (YYYY-MM-DD) it is from. */
export interface LiveQuote {
  date: string;
  price: number;
}

export interface LiveQuotes {
  /** 'open' while the regular session trades: prices are last sales. Otherwise, the last closes. */
  session: 'open' | 'closed';
  /** ISO time the quotes were read. */
  at: string;
  quotes: Record<string, LiveQuote>;
}

/** A portfolio's short name by its size: 10000 is "10k", 750 is "750". */
export const deskKey = (capital: number) =>
  capital >= 1000 && capital % 1000 === 0 ? `${capital / 1000}k` : String(capital);

/**
 * `history` plus one bar for each ticker whose quote is from a later day than its newest bar
 * (and than the entry), so a portfolio can be marked to that day before its close is
 * published. `date` is the newest day added, or null when the closes were already current.
 */
export function withLive(
  history: PaperHistory,
  quotes: Record<string, LiveQuote>,
  opened: string,
): { history: PaperHistory; date: string | null } {
  const out: PaperHistory = { ...history };
  let date: string | null = null;
  for (const [ticker, quote] of Object.entries(quotes)) {
    const bars = history[ticker] ?? [];
    const newest = bars.length ? bars[bars.length - 1].date : opened;
    if (!(quote.price > 0) || quote.date <= newest || quote.date <= opened) continue;
    out[ticker] = [...bars, { date: quote.date, close: quote.price }];
    if (date === null || quote.date > date) date = quote.date;
  }
  return { history: out, date };
}

const pct = (now: number, then: number) => (then ? (now / then - 1) * 100 : 0);

export function trackPortfolio(portfolio: PaperPortfolio, history: PaperHistory): PortfolioState {
  const { capital, opened } = portfolio;
  const parts = portfolio.positions.reduce((sum, p) => sum + p.parts, 0) || 1;
  const bars = portfolio.positions.map(
    (p) =>
      new Map(
        (history[p.ticker] ?? []).filter((b) => b.date > opened).map((b) => [b.date, b.close]),
      ),
  );
  const dates = [...new Set(bars.flatMap((m) => [...m.keys()]))].sort();
  const values = dates.map(() => 0);

  const positions = portfolio.positions.map((p, i): PositionState => {
    const weight = p.parts / parts;
    const cost = capital * weight;
    const shares = cost / p.entry;
    let last = p.entry;
    const moves = dates.map((date, d) => {
      const close = bars[i].get(date);
      const move = close === undefined ? null : pct(close, last);
      if (close !== undefined) last = close;
      values[d] += shares * last;
      return move;
    });
    const value = shares * last;
    return {
      ticker: p.ticker,
      weight,
      cost,
      shares,
      entry: p.entry,
      last,
      value,
      pnl: value - cost,
      pnlPct: pct(last, p.entry),
      moves,
    };
  });

  const days = dates.map((date, d): DayState => {
    const before = d === 0 ? capital : values[d - 1];
    return {
      date,
      value: values[d],
      change: values[d] - before,
      changePct: pct(values[d], before),
      total: values[d] - capital,
      totalPct: pct(values[d], capital),
    };
  });
  const value = days.length ? days[days.length - 1].value : capital;

  return { capital, value, pnl: value - capital, pnlPct: pct(value, capital), positions, days };
}
