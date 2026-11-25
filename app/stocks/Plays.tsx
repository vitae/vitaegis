'use client';

import { useState } from 'react';
import { AWAY, MOVES, optionPnl, sharesPnl, type Plays as PlaysData } from '@/lib/stocks-options';
import { signedPct, signedUsd, tone, usd } from './format';
import Prompt from './Prompt';
import styles from './stocks.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Plays
   For each stock the paper portfolios hold: what one put or call contract for the
   next monthly expiry costs, the move it needs, how often the stock has moved that
   far before, and what the contract and 100 shares would make at a move the
   reader picks. It prices choices; it does not make them.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  data: PlaysData;
  /** Company name per ticker. */
  names: Record<string, string>;
  /** The most shares of any one stock that any paper portfolio holds. */
  mostShares: number;
}

const STRIKES = [
  { flag: 'atm', label: 'at the money', where: 'nearest the share price' },
  { flag: '5', label: '5% out', where: 'nearest 5% out of the money' },
  { flag: '10', label: '10% out', where: 'nearest 10% out of the money' },
];
const DEFAULT_MOVE = -10;

const signedMove = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}%`;

/** 0.143 → "14%"; under a tenth it keeps a decimal, so a rare move does not read as never. */
const share = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  const pct = n * 100;
  return `${pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
};

export default function Plays({ data, names, mostShares }: Props) {
  const [move, setMove] = useState<number>(DEFAULT_MOVE);
  const [away, setAway] = useState(0);

  const down = move < 0;
  const side = down ? 'put' : 'call';
  const strike = STRIKES[away];

  return (
    <section id="plays" className={`${styles.section} ${styles.group}`}>
      <Prompt
        cmd="plays"
        flags={`--move ${signedMove(move)} --strike ${strike.flag}`}
        label="What a put, a call or 100 shares would make at a move you pick"
      />
      <div
        className="mt-4 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Move by the expiry to assume"
      >
        {MOVES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMove(m)}
            aria-pressed={m === move}
            aria-label={`Assume the shares ${m < 0 ? 'fall' : 'rise'} ${Math.abs(m)} percent`}
            className={`${styles.tab} ${m === move ? styles.tabOn : ''}`}
          >
            {signedMove(m)}
          </button>
        ))}
        <span className="ml-1 text-xs text-vitae-gray">by {data.expiry}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Strike to price">
        {STRIKES.map((s, i) => (
          <button
            key={s.flag}
            type="button"
            onClick={() => setAway(i)}
            aria-pressed={i === away}
            className={`${styles.tab} ${i === away ? styles.tabOn : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <table className={`${styles.table} mt-3`}>
        <caption className="sr-only">
          For each stock, one {side} contract expiring {data.expiry} with its strike {strike.where}:
          its cost, the move it needs, how often the stock moved that far before, and what it and
          100 shares would make if the shares {down ? 'fall' : 'rise'} {Math.abs(move)} percent
        </caption>
        <thead>
          <tr>
            <th scope="col" className="text-left">
              sym
            </th>
            <th scope="col" className="hidden text-right lg:table-cell">
              last
            </th>
            <th scope="col" className="hidden text-right lg:table-cell">
              ±priced
            </th>
            <th scope="col" className="text-right">
              {side}
            </th>
            <th scope="col" className="text-right">
              cost
            </th>
            <th scope="col" className="hidden text-right sm:table-cell">
              needs
            </th>
            <th scope="col" className="hidden text-right sm:table-cell">
              paid before
            </th>
            <th scope="col" className="hidden text-right lg:table-cell">
              moved before
            </th>
            <th scope="col" className="text-right">
              p/l
            </th>
            <th scope="col" className="hidden text-right lg:table-cell">
              on cost
            </th>
            <th scope="col" className="hidden text-right md:table-cell">
              {down ? 'short 100' : 'long 100'}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.plays.map((p) => {
            const option = (down ? p.puts : p.calls)[away];
            const pnl = option && p.last ? optionPnl(side, option, p.last, move) : null;
            const shares = p.last ? sharesPnl(p.last, move) : null;
            return (
              <tr key={p.ticker}>
                <th scope="row" className="text-left text-white">
                  {p.ticker}
                  <span className="hidden text-xs font-normal leading-tight text-vitae-gray sm:block">
                    {names[p.ticker]}
                  </span>
                </th>
                <td className="hidden text-right text-white lg:table-cell">
                  {p.last ? usd(p.last) : '—'}
                </td>
                <td className="hidden text-right text-white/80 lg:table-cell">
                  {p.priced === null ? '—' : `±${p.priced.toFixed(1)}%`}
                </td>
                <td className="text-right text-white/80">{option ? usd(option.strike) : '—'}</td>
                <td className="text-right text-white">
                  {option ? `$${usd(option.cost * 100)}` : '—'}
                </td>
                <td className="hidden text-right text-vitae-gray sm:table-cell">
                  {option ? signedPct(option.needs, 1) : '—'}
                </td>
                <td className="hidden text-right text-white/80 sm:table-cell">
                  {share(option?.paidBefore)}
                </td>
                <td className="hidden text-right text-white/80 lg:table-cell">
                  {share(p.happened?.[move])}
                </td>
                <td className={`text-right ${pnl === null ? 'text-vitae-gray' : tone(pnl)}`}>
                  {pnl === null ? '—' : signedUsd(pnl)}
                </td>
                <td
                  className={`hidden text-right lg:table-cell ${pnl === null ? 'text-vitae-gray' : tone(pnl)}`}
                >
                  {pnl === null || !option ? '—' : signedPct((pnl / (option.cost * 100)) * 100, 0)}
                </td>
                <td
                  className={`hidden text-right md:table-cell ${shares === null ? 'text-vitae-gray' : tone(shares)}`}
                >
                  {shares === null ? '—' : signedUsd(shares)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
        Arithmetic and history, not a forecast and not a recommendation. Each row is one contract
        (100 shares) of the {data.expiry} {side} with its strike {strike.where}, at Nasdaq&apos;s
        asking price{data.asOf ? ` as of ${data.asOf}` : ''}. needs is the move that brings the
        contract back to its cost at the expiry, {data.days} weekdays away. p/l is what it makes or
        loses if the shares have moved {signedMove(move)} by then, and {down ? 'short' : 'long'} 100
        is the same move on 100 shares {down ? 'sold short' : 'bought'}, before commissions
        {down ? ' and borrowing fees' : ''}.
      </p>
      <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
        ±priced is what a put and a call at the nearest strike cost together, as a share of the
        price: the move either way that the options market is charging for. The two history columns
        go back over the stock&apos;s daily closes, about five years of them and fewer for a recent
        listing: of every stretch as long as the one to the expiry, paid before is the share that
        finished beyond what the contract needs, and moved before the share that moved at least{' '}
        {signedMove(move)}. A dash means too little history or no quote.
      </p>
      <p className="mt-3 max-w-[76ch] text-xs text-vitae-gray">
        A contract that finishes on the wrong side of its strike loses its whole cost. Shares sold
        short lose as the price rises, with no ceiling, and need a margin account, shares to borrow
        and their fees.
        {mostShares < 100 &&
          ' One contract covers 100 shares, more than any of these portfolios holds of any stock, so none of these is sized to hedge a position.'}
      </p>
    </section>
  );
}
