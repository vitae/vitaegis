'use client';

import { useMemo, useState } from 'react';
import { defaultPeriod, groups, periods, type GroupKey, type PeriodKey } from './data';
import Prompt from './Prompt';
import styles from './stocks.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Stocks board
   One ranked table: ticker, name, start, end, change over the chosen period
   (1D … 5Y, YTD by default), filtered to one group or all. Sort by change or
   by ticker. Green up, red down,
   gray for the rest; a ticker with no start close for the period shows a dash.
   The command above the table restates the period, group and sort in effect.
   ═══════════════════════════════════════════════════════════════════════════════ */

type SortKey = 'change' | 'ticker';
type GroupFilter = 'all' | GroupKey;

export interface BoardRow {
  ticker: string;
  name: string;
  group: GroupKey;
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
  const [group, setGroup] = useState<GroupFilter>('all');
  const current = periods.find((p) => p.key === period) ?? periods[0];

  const shown = useMemo(
    () => (group === 'all' ? rows : rows.filter((r) => r.group === group)),
    [rows, group],
  );

  const sorted = useMemo(() => {
    const list = [...shown];
    if (sort === 'ticker') list.sort((a, b) => a.ticker.localeCompare(b.ticker));
    // Tickers with no data for the period sink to the bottom.
    else list.sort((a, b) => (pct(b, period) ?? -Infinity) - (pct(a, period) ?? -Infinity));
    return list;
  }, [shown, sort, period]);

  const changes = shown.map((r) => pct(r, period)).filter((p): p is number => p !== null);
  const up = changes.filter((p) => p >= 0).length;
  const down = changes.length - up;
  const missing = shown.length - changes.length;
  const heading = period === 'ytd' ? current.long : `Past ${current.long}`;

  const tab = (active: boolean, extra = '') =>
    `${styles.tab} ${active ? styles.tabOn : ''} ${extra}`;

  const toggle = (key: SortKey, text: string) => (
    <button
      type="button"
      onClick={() => setSort(key)}
      aria-pressed={sort === key}
      className={tab(sort === key)}
    >
      {text}
    </button>
  );

  return (
    <section id="scan" className={styles.section}>
      <Prompt
        cmd="scan"
        flags={`--period ${period} --group ${group} --sort ${sort}`}
        label="Market scan"
      />
      <p className="mt-4 max-w-[68ch] font-normal text-white/70">
        The market, big tech, chipmakers, memory and hardware, gold, silver and copper and their
        miners, uranium, space, and a handful of core holdings, ranked by how far they have moved
        over the period you pick. Prices are daily closes from Nasdaq, refreshed hourly.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{heading}</h3>
          <p className="mt-1 text-xs text-vitae-gray" aria-live="polite">
            <span className="text-vitae-green">{up} up</span>
            <span aria-hidden>{'  '}</span>
            <span className="text-vitae-red">{down} down</span>
            <span aria-hidden>{'  '}</span>
            <span>{asOf}</span>
            {source === 'snapshot' && <span> (live prices unavailable)</span>}
            {missing > 0 && source === 'live' && <span>, {missing} without data</span>}
          </p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Sort rows">
          {toggle('change', 'by change')}
          {toggle('ticker', 'by ticker')}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Group">
        {[{ key: 'all' as const, label: 'All' }, ...groups].map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            aria-pressed={g.key === group}
            className={tab(g.key === group)}
          >
            {g.label.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-8 gap-1.5" role="group" aria-label="Time period">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            aria-pressed={p.key === period}
            aria-label={p.key === 'ytd' ? 'Year to date' : p.long}
            className={tab(p.key === period, styles.tabTight)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <table className={`${styles.table} mt-4`}>
        <caption className="sr-only">
          Tickers with their close at the start of the period, latest close and percent change
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-7 text-left sm:w-9">
              #
            </th>
            <th scope="col" className="text-left">
              sym
            </th>
            <th scope="col" className="hidden w-1/5 text-right sm:table-cell">
              {shortDate(startDates[period]).toLowerCase()}
            </th>
            <th scope="col" className="w-1/5 text-right">
              latest
            </th>
            <th scope="col" className="w-1/5 text-right">
              change
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const p = pct(r, period);
            const start = r.starts[period];
            const upRow = p !== null && p >= 0;
            return (
              <tr key={r.ticker}>
                <td className="text-left text-vitae-gray">{i + 1}</td>
                <td className={`${styles.wrap} text-left`}>
                  <span className="block font-bold text-white">{r.ticker}</span>
                  <span className="block text-xs leading-tight text-vitae-gray">{r.name}</span>
                </td>
                <td className="hidden text-right text-vitae-gray sm:table-cell">
                  {start ? price(start) : '—'}
                </td>
                <td className="text-right text-white">{price(r.end)}</td>
                <td
                  className={`text-right font-bold ${
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
    </section>
  );
}
