'use client';

import { useState } from 'react';
import type { PortfolioState } from '@/lib/stocks-portfolio';
import type { PeriodKey } from './data';
import Prompt from './Prompt';
import TvChart from './TvChart';
import styles from './stocks.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Paper portfolio
   Six blocks of one terminal session: the portfolio's value, its positions, the
   positions ranked by how fast they gained, the gain or loss on every day since
   the entry (in total and per position), what a yearly return the reader picks
   would compound to, and a TradingView chart of whichever position is selected.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  state: PortfolioState;
  /** Company name per ticker. */
  names: Record<string, string>;
  /** TradingView symbol per ticker. */
  charts: Record<string, string>;
  /** Analysts' average price target per ticker at the entry, where it set the weight. */
  targets: Record<string, number | undefined>;
  /** Date of the entry closes, YYYY-MM-DD. */
  opened: string;
  /** Latest close and trailing start closes per held ticker, for the ranking. */
  trail: Record<string, { end: number; starts: Partial<Record<PeriodKey, number>> }>;
  /** When the latest closes are from, already formatted for display. */
  asOf: string;
}

type RankWindow = 'entry' | '1d' | '1w' | '1m';

/** `days` is the trading days the window spans; the entry window counts its own. */
const RANK_WINDOWS: Array<{ key: RankWindow; long: string; days: number }> = [
  { key: 'entry', long: 'since the entry', days: 0 },
  { key: '1d', long: 'over the past day', days: 1 },
  { key: '1w', long: 'over the past week', days: 5 },
  { key: '1m', long: 'over the past month', days: 21 },
];

/** Yearly returns the projection can assume, in percent. Ten is about the US market's long-run average. */
const PROJECT_RATES = [-20, -10, 0, 10, 20, 30];
const DEFAULT_RATE = 10;

const HORIZONS = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '5 years', months: 60 },
  { label: '10 years', months: 120 },
];

/** `iso` (YYYY-MM-DD) plus whole months, clamped to the last day of the month it lands in. */
const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

const signedRate = (n: number) => `${sign(n)}${Math.abs(n)}%`;

/** Days shown per position in the tape; narrow screens show the newest five. */
const TAPE_DAYS = 10;
const TAPE_DAYS_NARROW = 5;

const cents = (n: number) => Math.round(n * 100) / 100;
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');

const usd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const signedUsd = (n: number) => {
  const c = cents(n);
  return `${sign(c)}$${usd(Math.abs(c))}`;
};

const signedPct = (n: number, digits = 2) => {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return `${sign(r)}${Math.abs(r).toFixed(digits)}%`;
};

const tone = (n: number) => {
  const c = cents(n);
  return c > 0 ? 'text-vitae-green' : c < 0 ? 'text-vitae-red' : 'text-white/70';
};

const heat = (move: number | null, scale: number) => {
  if (move === null || cents(move) === 0) return undefined;
  const alpha = 0.12 + 0.5 * Math.min(1, Math.abs(move) / scale);
  return {
    backgroundColor: `rgba(${move > 0 ? '0, 255, 0' : '255, 0, 0'}, ${alpha.toFixed(2)})`,
  };
};

export default function PaperDesk({ state, names, charts, targets, opened, trail, asOf }: Props) {
  const [symbol, setSymbol] = useState(state.positions[0]?.ticker ?? '');
  const [rankBy, setRankBy] = useState<RankWindow>(state.days.length ? 'entry' : '1d');
  const [rate, setRate] = useState(DEFAULT_RATE);

  const latest = state.days[state.days.length - 1];
  const newestFirst = [...state.days].reverse();
  const ranked = latest ? [...state.positions].sort((a, b) => b.pnlPct - a.pnlPct) : [];
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  // A full meter is a quarter of the capital, or the largest position if one is bigger.
  const widest = Math.max(0.25, ...state.positions.map((p) => p.weight));
  const heaviestFirst = [...state.positions].sort((a, b) => b.weight - a.weight);
  const weightedByTarget = state.positions.some((p) => targets[p.ticker] !== undefined);
  const swing = Math.max(1, ...state.days.map((d) => Math.abs(d.changePct)));

  const tapeFrom = Math.max(0, state.days.length - TAPE_DAYS);
  const tapeDays = state.days.slice(tapeFrom);
  const tapeScale = Math.max(
    2,
    ...state.positions.flatMap((p) => p.moves.slice(tapeFrom).map((m) => Math.abs(m ?? 0))),
  );
  const narrowHides = (i: number) =>
    i < tapeDays.length - TAPE_DAYS_NARROW ? 'hidden sm:table-cell' : '';

  const rankWindow = RANK_WINDOWS.find((w) => w.key === rankBy) ?? RANK_WINDOWS[0];
  const rankDays = rankBy === 'entry' ? state.days.length : rankWindow.days;
  const ranking = state.positions
    .map((p) => {
      if (rankBy === 'entry') return { ticker: p.ticker, gain: latest ? p.pnlPct : null };
      const start = trail[p.ticker]?.starts[rankBy];
      return { ticker: p.ticker, gain: start ? (trail[p.ticker].end / start - 1) * 100 : null };
    })
    // Positions with no data for the window sink to the bottom.
    .sort((a, b) => (b.gain ?? -Infinity) - (a.gain ?? -Infinity));
  const reach = Math.max(1, ...ranking.map((r) => Math.abs(r.gain ?? 0)));

  const projectFrom = latest?.date ?? opened;
  const atTargets = state.positions.reduce(
    (sum, p) => sum + p.shares * (targets[p.ticker] ?? p.last),
    0,
  );

  const chart = (ticker: string) => {
    setSymbol(ticker);
    document.getElementById('chart')?.scrollIntoView({ block: 'start' });
  };

  return (
    <>
      <section id="portfolio" className={styles.section}>
        <Prompt cmd="portfolio" flags="--paper" label="Paper portfolio" />
        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] md:items-end">
          <div>
            <p className="text-xs text-vitae-gray">value</p>
            <p className={`${styles.equity} mt-2`}>${usd(state.value)}</p>
            <p className={`mt-4 text-base ${tone(state.pnl)}`}>
              {signedUsd(state.pnl)}
              <span className="ml-3">{signedPct(state.pnlPct)}</span>
              <span className="ml-3 text-sm text-vitae-gray">since entry</span>
            </p>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>opened</dt>
              <dd>{opened} close</dd>
            </div>
            <div>
              <dt>capital</dt>
              <dd>${usd(state.capital)}</dd>
            </div>
            <div>
              <dt>marked to</dt>
              <dd>{latest ? `${latest.date} close` : 'entry'}</dd>
            </div>
            <div>
              <dt>last day</dt>
              <dd className={latest ? tone(latest.change) : 'text-vitae-gray'}>
                {latest
                  ? `${signedUsd(latest.change)}  ${signedPct(latest.changePct)}`
                  : 'none yet'}
              </dd>
            </div>
            <div>
              <dt>best</dt>
              <dd className={best ? tone(best.pnl) : 'text-vitae-gray'}>
                {best ? `${best.ticker}  ${signedPct(best.pnlPct)}` : 'none yet'}
              </dd>
            </div>
            <div>
              <dt>worst</dt>
              <dd className={worst ? tone(worst.pnl) : 'text-vitae-gray'}>
                {worst ? `${worst.ticker}  ${signedPct(worst.pnlPct)}` : 'none yet'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="positions" className={styles.section}>
        <Prompt cmd="positions" label="Positions" />
        <table className={`${styles.table} mt-4`}>
          <caption className="sr-only">
            Each position&apos;s weight, shares, entry price, analyst target, latest close and gain
            or loss since the entry
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                sym
              </th>
              <th scope="col" className="text-right">
                wgt
              </th>
              <th scope="col" className="hidden text-right md:table-cell">
                shares
              </th>
              <th scope="col" className="text-right">
                entry
              </th>
              {weightedByTarget && (
                <th scope="col" className="hidden text-right md:table-cell">
                  target
                </th>
              )}
              <th scope="col" className="text-right">
                last
              </th>
              <th scope="col" className="hidden text-right sm:table-cell">
                day
              </th>
              <th scope="col" className="hidden text-right sm:table-cell">
                p/l $
              </th>
              <th scope="col" className="text-right">
                p/l %
              </th>
            </tr>
          </thead>
          <tbody>
            {heaviestFirst.map((p) => {
              const day = p.moves[p.moves.length - 1] ?? null;
              const target = targets[p.ticker];
              return (
                <tr key={p.ticker}>
                  <th scope="row" className="text-left">
                    <button
                      type="button"
                      className={styles.sym}
                      onClick={() => chart(p.ticker)}
                      aria-label={`Chart ${names[p.ticker] ?? p.ticker}`}
                    >
                      {p.ticker}
                    </button>
                    <span className="hidden text-xs leading-tight text-vitae-gray sm:block">
                      {names[p.ticker]}
                    </span>
                  </th>
                  <td className="text-right text-white/80">
                    {(p.weight * 100).toFixed(2)}%
                    <span className={styles.meter} aria-hidden>
                      <span style={{ width: `${(p.weight / widest) * 100}%` }} />
                    </span>
                  </td>
                  <td className="hidden text-right text-white/80 md:table-cell">
                    {p.shares.toFixed(4)}
                  </td>
                  <td className="text-right text-vitae-gray">{usd(p.entry)}</td>
                  {weightedByTarget && (
                    <td className="hidden text-right text-vitae-gray md:table-cell">
                      {target === undefined ? '—' : usd(target)}
                    </td>
                  )}
                  <td className="text-right text-white">{usd(p.last)}</td>
                  <td
                    className={`hidden text-right sm:table-cell ${day === null ? 'text-vitae-gray' : tone(day)}`}
                  >
                    {day === null ? '—' : signedPct(day)}
                  </td>
                  <td className={`hidden text-right sm:table-cell ${tone(p.pnl)}`}>
                    {signedUsd(p.pnl)}
                  </td>
                  <td className={`text-right ${tone(p.pnl)}`}>{signedPct(p.pnlPct)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="text-left">
                total
              </th>
              <td className="text-right">100%</td>
              <td className="hidden md:table-cell" />
              <td className="text-right text-vitae-gray">{usd(state.capital)}</td>
              {weightedByTarget && <td className="hidden md:table-cell" />}
              <td className="text-right">{usd(state.value)}</td>
              <td
                className={`hidden text-right sm:table-cell ${latest ? tone(latest.change) : 'text-vitae-gray'}`}
              >
                {latest ? signedPct(latest.changePct) : '—'}
              </td>
              <td className={`hidden text-right sm:table-cell ${tone(state.pnl)}`}>
                {signedUsd(state.pnl)}
              </td>
              <td className={`text-right ${tone(state.pnl)}`}>{signedPct(state.pnlPct)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
          {weightedByTarget &&
            `Each weight is in proportion to how far analysts' average 12-month price target sat above the entry price on ${opened}. A target is an opinion, not a forecast. `}
          Select a symbol to chart it.
        </p>
      </section>

      <section id="rank" className={styles.section}>
        <Prompt cmd="rank" flags={`--window ${rankBy}`} label="Positions ranked by gain" />
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Window to rank over">
          {RANK_WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setRankBy(w.key)}
              aria-pressed={w.key === rankBy}
              aria-label={`Rank ${w.long}`}
              className={`${styles.tab} ${w.key === rankBy ? styles.tabOn : ''}`}
            >
              {w.key}
            </button>
          ))}
        </div>
        <table className={`${styles.table} mt-3`}>
          <caption className="sr-only">
            Positions ranked by percent gain {rankWindow.long}, with the gain per trading day
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-7 text-left sm:w-9">
                #
              </th>
              <th scope="col" className="text-left">
                sym
              </th>
              <th scope="col" className="text-right">
                gain
              </th>
              <th scope="col" className="text-right">
                per day
              </th>
              <th scope="col" className="hidden w-[36%] sm:table-cell">
                <span className="sr-only">Size of the gain</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.ticker}>
                <td className="text-left text-vitae-gray">{i + 1}</td>
                <th scope="row" className="text-left">
                  <button
                    type="button"
                    className={styles.sym}
                    onClick={() => chart(r.ticker)}
                    aria-label={`Chart ${names[r.ticker] ?? r.ticker}`}
                  >
                    {r.ticker}
                  </button>
                </th>
                <td className={`text-right ${r.gain === null ? 'text-vitae-gray' : tone(r.gain)}`}>
                  {r.gain === null ? '—' : signedPct(r.gain)}
                </td>
                <td className={`text-right ${r.gain === null ? 'text-vitae-gray' : tone(r.gain)}`}>
                  {r.gain === null || !rankDays ? '—' : signedPct(r.gain / rankDays)}
                </td>
                <td className="hidden sm:table-cell" aria-hidden>
                  <span className={styles.swing}>
                    <i
                      className={styles.swingDown}
                      style={{
                        width: r.gain !== null && r.gain < 0 ? `${(-r.gain / reach) * 100}%` : 0,
                      }}
                    />
                    <i className={styles.swingAxis} />
                    <i
                      className={styles.swingUp}
                      style={{
                        width: r.gain !== null && r.gain > 0 ? `${(r.gain / reach) * 100}%` : 0,
                      }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
          {rankBy === 'entry'
            ? latest
              ? `Gain since the ${opened} entry, and that gain per trading day held (${rankDays}).`
              : 'No closes after the entry yet. Pick 1d, 1w or 1m to rank the trailing move.'
            : `The move ${rankWindow.long}, and that move per trading day (${rankDays}). ${asOf}. A dash means the stock has not traded that long.`}
        </p>
      </section>

      <section id="log" className={styles.section}>
        <Prompt cmd="log" flags="--daily" label="Daily gains and losses" />
        <table className={`${styles.table} mt-4`}>
          <caption className="sr-only">
            The portfolio&apos;s value at each daily close since the entry, with the day&apos;s gain
            or loss and the running total
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                date
              </th>
              <th scope="col" className="text-right">
                value
              </th>
              <th scope="col" className="hidden text-right sm:table-cell">
                day $
              </th>
              <th scope="col" className="text-right">
                day %
              </th>
              <th scope="col" className="text-right">
                total %
              </th>
              <th scope="col" className="hidden w-[28%] sm:table-cell">
                <span className="sr-only">Size of the day&apos;s move</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((d) => (
              <tr key={d.date}>
                <th scope="row" className="text-left text-white">
                  {d.date}
                </th>
                <td className="text-right text-white">{usd(d.value)}</td>
                <td className={`hidden text-right sm:table-cell ${tone(d.change)}`}>
                  {signedUsd(d.change)}
                </td>
                <td className={`text-right ${tone(d.change)}`}>{signedPct(d.changePct)}</td>
                <td className={`text-right ${tone(d.total)}`}>{signedPct(d.totalPct)}</td>
                <td className="hidden sm:table-cell" aria-hidden>
                  <span className={styles.swing}>
                    <i
                      className={styles.swingDown}
                      style={{
                        width: d.change < 0 ? `${(Math.abs(d.changePct) / swing) * 100}%` : 0,
                      }}
                    />
                    <i className={styles.swingAxis} />
                    <i
                      className={styles.swingUp}
                      style={{ width: d.change > 0 ? `${(d.changePct / swing) * 100}%` : 0 }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="text-left text-vitae-gray">
                {opened}
              </th>
              <td className="text-right text-vitae-gray">{usd(state.capital)}</td>
              <td className="hidden sm:table-cell" />
              <td colSpan={2} className="text-right text-vitae-gray">
                entry
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tbody>
        </table>
        {!latest && (
          <p className="mt-4 max-w-[68ch] font-normal text-white/70">
            No closes after the entry yet. The first row prints after the next market close.
          </p>
        )}

        {tapeDays.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className={styles.tape}>
              <caption className="pb-2 text-left text-xs text-vitae-gray">
                Each position&apos;s move per day
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Symbol</span>
                  </th>
                  {tapeDays.map((d, i) => (
                    <th key={d.date} scope="col" className={narrowHides(i)}>
                      {d.date.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.positions.map((p) => (
                  <tr key={p.ticker}>
                    <th scope="row">{p.ticker}</th>
                    {p.moves.slice(tapeFrom).map((m, i) => (
                      <td
                        key={tapeDays[i].date}
                        className={narrowHides(i)}
                        style={heat(m, tapeScale)}
                      >
                        {m === null ? (
                          <span className="text-vitae-gray">no bar</span>
                        ) : (
                          signedPct(m, 1)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="project" className={styles.section}>
        <Prompt
          cmd="project"
          flags={`--rate ${signedRate(rate)}`}
          label="What a yearly return would compound to"
        />
        <div
          className="mt-4 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Yearly return to assume"
        >
          {PROJECT_RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              aria-pressed={r === rate}
              aria-label={`Assume ${r} percent a year`}
              className={`${styles.tab} ${r === rate ? styles.tabOn : ''}`}
            >
              {r === 0 ? '0%' : signedRate(r)}
            </button>
          ))}
          <span className="ml-1 text-xs text-vitae-gray">a year</span>
        </div>
        <table className={`${styles.table} mt-3`}>
          <caption className="sr-only">
            The portfolio&apos;s value and profit at six horizons if it returned {rate} percent a
            year from {projectFrom}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                in
              </th>
              <th scope="col" className="hidden text-left sm:table-cell">
                on
              </th>
              <th scope="col" className="text-right">
                value
              </th>
              <th scope="col" className="text-right">
                profit
              </th>
              <th scope="col" className="hidden text-right sm:table-cell">
                profit %
              </th>
            </tr>
          </thead>
          <tbody>
            {HORIZONS.map((h) => {
              const value = state.value * (1 + rate / 100) ** (h.months / 12);
              const profit = value - state.capital;
              return (
                <tr key={h.months}>
                  <th scope="row" className="text-left text-white">
                    {h.label}
                  </th>
                  <td className="hidden text-left text-vitae-gray sm:table-cell">
                    {addMonths(projectFrom, h.months)}
                  </td>
                  <td className="text-right text-white">{usd(value)}</td>
                  <td className={`text-right ${tone(profit)}`}>{signedUsd(profit)}</td>
                  <td className={`hidden text-right sm:table-cell ${tone(profit)}`}>
                    {signedPct((profit / state.capital) * 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
          Arithmetic, not a forecast: today&apos;s value compounded at the yearly return you pick.
          About 10% a year is the US stock market&apos;s long-run average, and single stocks stray
          far from it in both directions.
          {weightedByTarget &&
            ` If every position reached its analyst target by ${addMonths(opened, 12)}, the portfolio would be worth $${usd(atTargets)} (${signedUsd(atTargets - state.capital)}).`}
        </p>
      </section>

      <section id="chart" className={styles.section}>
        <Prompt
          cmd="chart"
          flags={symbol.toLowerCase()}
          label={`${names[symbol] ?? symbol} chart`}
        />
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Symbol to chart">
          {state.positions.map((p) => (
            <button
              key={p.ticker}
              type="button"
              onClick={() => setSymbol(p.ticker)}
              aria-pressed={p.ticker === symbol}
              className={`${styles.tab} ${p.ticker === symbol ? styles.tabOn : ''}`}
            >
              {p.ticker}
            </button>
          ))}
        </div>
        <div className={`${styles.chart} mt-3`}>
          {charts[symbol] && <TvChart symbol={charts[symbol]} name={names[symbol] ?? symbol} />}
        </div>
        <p className="mt-3 text-xs text-vitae-gray">
          1W, 1M, 6M, 1Y and 5Y under the chart change its span. Chart by{' '}
          <a
            href={`https://www.tradingview.com/symbols/${(charts[symbol] ?? '').replace(':', '-')}/`}
            target="_blank"
            rel="noopener nofollow"
            className="inline min-h-0 text-white underline underline-offset-2 hover:text-vitae-green"
          >
            TradingView
          </a>
          .
        </p>
      </section>
    </>
  );
}
