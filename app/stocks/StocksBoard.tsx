'use client';

import { useMemo, useState } from 'react';
import type { StockRow } from './data';
import styles from './stocks.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks board
   One ranked table: ticker, name, start, end, change since Dec 31, 2025.
   Sort by change or by ticker. Green up, red down, gray for the rest.
   ═══════════════════════════════════════════════════════════════════════════════ */

type SortKey = 'change' | 'ticker';

interface Props {
  rows: StockRow[];
  /** Already formatted for display, e.g. "Closes as of Sep 23, 2026" or "Snapshot". */
  asOf: string;
  source: 'live' | 'snapshot';
}

const pct = (r: StockRow) => ((r.end - r.start) / r.start) * 100;

const price = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const change = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;

export default function StocksBoard({ rows, asOf, source }: Props) {
  const [sort, setSort] = useState<SortKey>('change');

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sort === 'ticker') list.sort((a, b) => a.ticker.localeCompare(b.ticker));
    else list.sort((a, b) => pct(b) - pct(a));
    return list;
  }, [rows, sort]);

  const up = rows.filter((r) => pct(r) >= 0).length;
  const down = rows.length - up;

  const toggle = (key: SortKey, text: string) => {
    const active = sort === key;
    return (
      <button
        type="button"
        onClick={() => setSort(key)}
        aria-pressed={active}
        className={`rounded-full border px-4 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-vitae-green focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-safe:transition-colors ${
          active
            ? 'border-vitae-green bg-vitae-green text-black'
            : 'border-white/25 text-vitae-gray hover:border-white/60 hover:text-white'
        }`}
      >
        {text}
      </button>
    );
  };

  return (
    <section aria-labelledby="stocks-board-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="stocks-board-heading" className="text-xl font-medium text-white">
            Since Dec 31, 2025
          </h2>
          <p className="mt-1 text-sm text-vitae-gray" aria-live="polite">
            <span className="text-vitae-green">{up} up</span>
            <span aria-hidden> · </span>
            <span className="text-vitae-red">{down} down</span>
            <span aria-hidden> · </span>
            <span>{asOf}</span>
            {source === 'snapshot' && <span> (live prices unavailable)</span>}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sort rows">
          {toggle('change', 'By change')}
          {toggle('ticker', 'By ticker')}
        </div>
      </div>

      <div className="mt-6">
        <table className={`w-full border-collapse text-left ${styles.numeric}`}>
          <caption className="sr-only">
            Twelve tickers with their Dec 31, 2025 close, latest close and percent change
          </caption>
          <thead>
            <tr className="border-b border-white/20 text-xs font-normal text-vitae-gray">
              <th scope="col" className="w-6 py-2 pr-2 font-normal sm:w-8">
                #
              </th>
              <th scope="col" className="py-2 pr-2 font-normal">
                Ticker
              </th>
              <th scope="col" className="w-1/5 py-2 pr-2 text-right font-normal">
                Dec 31
              </th>
              <th scope="col" className="w-1/5 py-2 pr-2 text-right font-normal">
                Latest
              </th>
              <th scope="col" className="w-1/5 py-2 text-right font-normal">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const p = pct(r);
              const upRow = p >= 0;
              return (
                <tr
                  key={r.ticker}
                  className={`${styles.row} border-b border-white/10 hover:bg-white/[0.04]`}
                >
                  <td className="py-3 pr-2 text-xs text-vitae-gray sm:text-sm">{i + 1}</td>
                  <td className="py-3 pr-2">
                    <span className="block text-sm font-medium text-white sm:text-base">{r.ticker}</span>
                    <span className="block text-xs leading-tight text-vitae-gray sm:text-sm">
                      {r.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-2 text-right text-xs text-vitae-gray sm:text-sm">{price(r.start)}</td>
                  <td className="whitespace-nowrap py-3 pr-2 text-right text-sm text-white sm:text-base">{price(r.end)}</td>
                  <td
                    className={`${styles.change} whitespace-nowrap py-3 text-right text-sm font-medium sm:text-base ${
                      upRow ? 'text-vitae-green' : 'text-vitae-red'
                    }`}
                  >
                    <span className="sr-only">{upRow ? 'up ' : 'down '}</span>
                    {change(p)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
