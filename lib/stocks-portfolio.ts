import type { PaperPortfolio } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Paper portfolio
   Marks the paper portfolio in app/stocks/data.ts to the daily closes that came
   after it opened. Each position is bought at its entry close with its share of
   the capital; on a day a ticker has no bar, its previous close carries forward.
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
