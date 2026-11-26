import type { PaperPortfolio } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Paper portfolio
   Marks the paper portfolio in app/stocks/data.ts to the daily closes that came
   after it opened. Each position is bought at its entry close with its share of
   the capital; on a day a ticker has no bar, its previous close carries forward.
   A switch sells positions at recorded prices and puts what they fetch into one
   that stays, from that day's close on.
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
  /** What was paid for it as a share of the capital, 0 to 1. */
  weight: number;
  /** What was paid for it, including anything a switch added. */
  cost: number;
  shares: number;
  /** Price paid per share; an average once a switch has added to the position. */
  entry: number;
  /** Latest regular-session price on record: a close, a switch made during a session, or the entry. */
  last: number;
  value: number;
  pnl: number;
  pnlPct: number;
  /** Percent move on each tracked day, oldest first; null where the ticker had no bar. */
  moves: Array<number | null>;
}

/** A position sold in a switch. */
export interface ClosedState {
  ticker: string;
  /** New York date and clock time of the sale. */
  date: string;
  time: string;
  /** Sold after that day's close. */
  afterClose: boolean;
  cost: number;
  shares: number;
  entry: number;
  /** Price sold at. */
  price: number;
  proceeds: number;
  pnl: number;
  pnlPct: number;
  /** The position that took the proceeds, the shares they bought and the price paid. */
  into: string;
  bought: number;
  intoPrice: number;
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
  /** Positions sold since the entry, oldest sale first. */
  closed: ClosedState[];
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
  // Oldest first; on one day, a switch made during the session comes before one made after it.
  const switches = [...(portfolio.switches ?? [])].sort(
    (a, b) => a.date.localeCompare(b.date) || Number(!!a.afterClose) - Number(!!b.afterClose),
  );
  const sales = switches.flatMap((s) => s.sold);
  const parts = [...portfolio.positions, ...sales].reduce((sum, p) => sum + p.parts, 0) || 1;

  const hold = (p: { ticker: string; parts: number; entry: number }) => {
    const cost = (capital * p.parts) / parts;
    return {
      ticker: p.ticker,
      entry: p.entry,
      cost,
      shares: cost / p.entry,
      /** Previous close, which the next day's move is measured from. */
      last: p.entry,
      /** Latest price on record, which the position is valued at. */
      price: p.entry,
      added: false,
      bars: new Map(
        (history[p.ticker] ?? []).filter((b) => b.date > opened).map((b) => [b.date, b.close]),
      ),
    };
  };
  const open = portfolio.positions.map(hold);
  // Sold positions are still held on every day before their switch.
  const leaving = new Map(sales.map((s) => [s.ticker, hold(s)]));
  const closed: ClosedState[] = [];

  let next = 0;
  const applySwitches = (through?: string) => {
    for (; next < switches.length; next++) {
      const sw = switches[next];
      // A switch made after a day's close leaves that day's value alone.
      if (through !== undefined && (sw.afterClose ? sw.date >= through : sw.date > through)) return;
      const into = open.find((h) => h.ticker === sw.into);
      for (const sale of sw.sold) {
        const sold = leaving.get(sale.ticker);
        if (!sold || !into) continue;
        const proceeds = sold.shares * sale.price;
        closed.push({
          ticker: sold.ticker,
          date: sw.date,
          time: sw.time,
          afterClose: !!sw.afterClose,
          cost: sold.cost,
          shares: sold.shares,
          entry: sold.entry,
          price: sale.price,
          proceeds,
          pnl: proceeds - sold.cost,
          pnlPct: pct(sale.price, sold.entry),
          into: sw.into,
          bought: proceeds / sw.price,
          intoPrice: sw.price,
        });
        leaving.delete(sale.ticker);
        into.shares += proceeds / sw.price;
        into.cost += proceeds;
        into.added = true;
        // A price paid during the session is the newest regular-session price on record. One
        // paid after the close is not: the position stays marked to that day's close.
        if (!sw.afterClose) into.price = sw.price;
      }
    }
  };

  const dates = [
    ...new Set([...open, ...leaving.values()].flatMap((h) => [...h.bars.keys()])),
  ].sort();
  const moves: Array<Array<number | null>> = open.map(() => []);
  const values = dates.map((date) => {
    applySwitches(date);
    let value = 0;
    [...open, ...leaving.values()].forEach((h, i) => {
      const close = h.bars.get(date);
      if (i < open.length) moves[i].push(close === undefined ? null : pct(close, h.last));
      if (close !== undefined) h.last = h.price = close;
      value += h.shares * h.price;
    });
    return value;
  });
  // A switch made after the newest close still counts: it has happened.
  const switchedSince = next < switches.length;
  applySwitches();

  const positions = open.map((h, i): PositionState => {
    const value = h.shares * h.price;
    return {
      ticker: h.ticker,
      weight: h.cost / capital,
      cost: h.cost,
      shares: h.shares,
      entry: h.added ? h.cost / h.shares : h.entry,
      last: h.price,
      value,
      pnl: value - h.cost,
      pnlPct: h.added ? pct(value, h.cost) : pct(h.price, h.entry),
      moves: moves[i],
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
  const value = switchedSince
    ? positions.reduce((sum, p) => sum + p.value, 0)
    : days.length
      ? days[days.length - 1].value
      : capital;

  return {
    capital,
    value,
    pnl: value - capital,
    pnlPct: pct(value, capital),
    positions,
    closed,
    days,
  };
}
