import type { PaperPortfolio, PaperSwitch, PaperTrim } from '@/app/stocks/data';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Paper portfolio
   Marks the paper portfolio in app/stocks/data.ts to the daily closes that came
   after it opened. Each position is bought at its entry close with its share of
   the capital; on a day a ticker has no bar, its previous close carries forward.
   A switch sells positions at recorded prices and puts what they fetch into one
   that stays, from that day's close on. A trim sells part of a position that
   stays and buys another with it.
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
  /** How many of the oldest tracked days passed before it was first bought; their moves are null. */
  idle: number;
}

/** A sale: a whole position in a switch, or part of one that stays in a trim. */
export interface ClosedState {
  ticker: string;
  /** Only part of the position was sold; the rest is still held. */
  partial: boolean;
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
  /** `into` was not held until these proceeds bought it. */
  intoNew: boolean;
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

/** A switch or a trim, with what the two have in common: when it was made and what it bought. */
interface Change {
  when: PaperSwitch | PaperTrim;
  sw?: PaperSwitch;
  trim?: PaperTrim;
}

export function trackPortfolio(portfolio: PaperPortfolio, history: PaperHistory): PortfolioState {
  const { capital, opened } = portfolio;
  // Oldest first; on one day, a change made during the session comes before one made after it,
  // and at one time of day a switch comes before a trim.
  const changes: Change[] = [
    ...(portfolio.switches ?? []).map((sw) => ({ when: sw, sw })),
    ...(portfolio.trims ?? []).map((trim) => ({ when: trim, trim })),
  ].sort(
    (a, b) =>
      a.when.date.localeCompare(b.when.date) ||
      Number(!!a.when.afterClose) - Number(!!b.when.afterClose) ||
      a.when.time.localeCompare(b.when.time),
  );
  const sales = (portfolio.switches ?? []).flatMap((s) => s.sold);
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
      /** False until a trim first buys a position that was not bought with the portfolio. */
      begun: cost > 0,
      /** Tracked days that passed before then. */
      idle: 0,
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
  const applyChanges = (through?: string) => {
    for (; next < changes.length; next++) {
      const { sw, trim, when } = changes[next];
      // A change made after a day's close leaves that day's value alone.
      if (through !== undefined && (when.afterClose ? when.date >= through : when.date > through))
        return;
      const into = open.find((h) => h.ticker === when.into);
      if (!into) continue;
      const record = { date: when.date, time: when.time, afterClose: !!when.afterClose };
      const buy = (proceeds: number) => {
        const intoNew = !into.shares;
        into.shares += proceeds / when.price;
        into.cost += proceeds;
        into.added = into.begun = true;
        // A price paid during the session is the newest regular-session price on record. One
        // paid after the close is not: the position stays marked to that day's close.
        if (!when.afterClose) into.price = when.price;
        return { into: when.into, bought: proceeds / when.price, intoPrice: when.price, intoNew };
      };
      for (const sale of sw?.sold ?? []) {
        const sold = leaving.get(sale.ticker);
        if (!sold) continue;
        const proceeds = sold.shares * sale.price;
        closed.push({
          ticker: sold.ticker,
          partial: false,
          ...record,
          cost: sold.cost,
          shares: sold.shares,
          entry: sold.entry,
          price: sale.price,
          proceeds,
          pnl: proceeds - sold.cost,
          pnlPct: pct(sale.price, sold.entry),
          ...buy(proceeds),
        });
        leaving.delete(sale.ticker);
      }
      const from = trim && trim.from !== trim.into && open.find((h) => h.ticker === trim.from);
      if (trim && from && from.shares > 0) {
        // No more than the position holds.
        const shares = Math.min(from.shares, (capital * trim.share) / trim.fromPrice);
        const proceeds = shares * trim.fromPrice;
        // The shares sold cost what the position's shares cost on average.
        const entry = from.cost / from.shares;
        const cost = shares * entry;
        closed.push({
          ticker: from.ticker,
          partial: shares < from.shares,
          ...record,
          cost,
          shares,
          entry,
          price: trim.fromPrice,
          proceeds,
          pnl: proceeds - cost,
          pnlPct: pct(trim.fromPrice, entry),
          ...buy(proceeds),
        });
        from.shares -= shares;
        from.cost -= cost;
        if (!trim.afterClose) from.price = trim.fromPrice;
      }
    }
  };

  const dates = [
    ...new Set([...open, ...leaving.values()].flatMap((h) => [...h.bars.keys()])),
  ].sort();
  const moves: Array<Array<number | null>> = open.map(() => []);
  const values = dates.map((date) => {
    applyChanges(date);
    let value = 0;
    [...open, ...leaving.values()].forEach((h, i) => {
      const close = h.bars.get(date);
      // A position a trim has yet to buy has no move of its own, but its close is still the
      // price it is marked to once bought, and what its first move is measured from.
      if (i < open.length) {
        moves[i].push(close === undefined || !h.shares ? null : pct(close, h.last));
        if (!h.begun) h.idle++;
      }
      if (close !== undefined) h.last = h.price = close;
      value += h.shares * h.price;
    });
    return value;
  });
  // A change made after the newest close still counts: it has happened.
  const changedSince = next < changes.length;
  applyChanges();

  const positions = open.map((h, i): PositionState => {
    const value = h.shares * h.price;
    return {
      ticker: h.ticker,
      weight: h.cost / capital,
      cost: h.cost,
      shares: h.shares,
      entry: h.added && h.shares ? h.cost / h.shares : h.entry,
      last: h.price,
      value,
      pnl: value - h.cost,
      pnlPct: h.added ? pct(value, h.cost) : pct(h.price, h.entry),
      moves: moves[i],
      idle: h.idle,
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
  const value = changedSince
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
