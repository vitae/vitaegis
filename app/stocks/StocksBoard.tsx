'use client';

import { useMemo, useState } from 'react';
import { defaultPeriod, periods, type PeriodKey } from './data';
import styles from './stocks.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks board
   One ranked table: ticker, name, start, end, change over the chosen period
   (1D … 5Y, YTD by default). Sort by change or by ticker. Green up, red down,
   gray for the rest; a ticker with no start close for the period shows a dash.
   ═══════════════════════════════════════════════════════════════════════════════ */

type SortKey = 'change' | 'ticker';

export interface BoardRow {
  ticker: string;
  name: string;
  /** Latest close. */
  end: number;
  /** Start close per period; a missing key means no data for that period. */
  starts: Partial<Record<PeriodKey, number>>;
}

interface Props {
  rows: BoardRow[];
  /** ISO date (YYYY-MM-DD) each period starts from. */
  startDates: Partial<Record<PeriodKey, string>>;
  /** Already formatted for display, e.g. "Closes as of Sep 23, 2026" or "Snapshot". */
  asOf: string;
  source: 'live' | 'snapshot';
}

const pct = (r: BoardRow, period: PeriodKey): number | null => {
  const start = r.starts[period];
  return start ? ((r.end - start) / start) * 100 : null;
};

/** "Sep 16", or "Sep 16 '21" outside the current year. */
const shortDate = (iso: string | undefined) => {
  if (!iso) return 'Start';
  const d = new Date(`${iso}T12:00:00Z`);
  const text = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  return year === new Date().getUTCFullYear() ? text : `${text} '${String(year).slice(2)}`;
};

const price = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const change = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;

export default function StocksBoard({ rows, startDates, asOf, source }: Props) {
  const [sort, setSort] = useState<SortKey>('change');
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const current = periods.find((p) => p.key === period) ?? periods[0];

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sort === 'ticker') list.sort((a, b) => a.ticker.localeCompare(b.ticker));
    // Tickers with no data for the period sink to the bottom.
    else list.sort((a, b) => (pct(b, period) ?? -Infinity) - (pct(a, period) ?? -Infinity));
    return list;
  }, [rows, sort, period]);

  const changes = rows.map((r) => pct(r, period)).filter((p): p is number => p !== null);
  const up = changes.filter((p) => p >= 0).length;
  const down = changes.length - up;
  const missing = rows.length - changes.length;
  const heading = period === 'ytd' ? current.long : `Past ${current.long}`;

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
            {heading}
          </h2>
          <p className="mt-1 text-sm text-vitae-gray" aria-live="polite">
            <span className="text-vitae-green">{up} up</span>
            <span aria-hidden> · </span>
            <span className="text-vitae-red">{down} down</span>
            <span aria-hidden> · </span>
            <span>{asOf}</span>
            {source === 'snapshot' && <span> (live prices unavailable)</span>}
            {missing > 0 && source === 'live' && <span> · {missing} without data</span>}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sort rows">
          {toggle('change', 'By change')}
          {toggle('ticker', 'By ticker')}
        </div>
      </div>

      <div
        className="mt-6 grid grid-cols-8 gap-1 rounded-full border border-white/15 p-1"
        role="group"
        aria-label="Time period"
      >
        {periods.map((p) => {
          const active = p.key === period;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={active}
              aria-label={p.key === 'ytd' ? 'Year to date' : p.long}
              className={`rounded-full py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-vitae-green sm:text-sm motion-safe:transition-colors ${
                active ? 'bg-vitae-green text-black' : 'text-vitae-gray hover:text-white'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <table className={`w-full border-collapse text-left ${styles.numeric}`}>
          <caption className="sr-only">
            Twelve tickers with their close at the start of the period, latest close and percent change
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
                {shortDate(startDates[period])}
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
              const p = pct(r, period);
              const start = r.starts[period];
              const upRow = p !== null && p >= 0;
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
                  <td className="whitespace-nowrap py-3 pr-2 text-right text-xs text-vitae-gray sm:text-sm">{start ? price(start) : '—'}</td>
                  <td className="whitespace-nowrap py-3 pr-2 text-right text-sm text-white sm:text-base">{price(r.end)}</td>
                  <td
                    className={`${styles.change} whitespace-nowrap py-3 text-right text-sm font-medium sm:text-base ${
                      p === null ? 'text-vitae-gray' : upRow ? 'text-vitae-green' : 'text-vitae-red'
                    }`}
                  >
                    {p === null ? (
                      <>
                        <span aria-hidden>—</span>
                        <span className="sr-only">no data</span>
                      </>
                    ) : (
                      <>
                        <span className="sr-only">{upRow ? 'up ' : 'down '}</span>
                        {change(p)}
                      </>
                    )}
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
