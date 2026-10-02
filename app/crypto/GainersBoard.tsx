'use client';

import { useState } from 'react';
import type { Coin, GainWindow } from '@/lib/crypto/gainers';
import styles from './crypto.module.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Biggest gainers
   Top ten movers among the 250 largest coins over a day, week, month or year.
   Stablecoins, wrapped and staked tokens and thin markets are left out.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  windows: { key: GainWindow; label: string; long: string }[];
  lists: Record<GainWindow, Coin[]>;
  available: boolean;
}

const price = (n: number) =>
  n >= 1
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${n.toPrecision(3)}`;

const gain = (n: number) =>
  `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

export default function GainersBoard({ windows, lists, available }: Props) {
  const [win, setWin] = useState<GainWindow>('24h');
  const current = windows.find((w) => w.key === win) ?? windows[0];
  const rows = lists[win] ?? [];

  return (
    <section aria-labelledby="gainers-heading" className={`mt-14 ${styles.numeric}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="gainers-heading" className="text-xl font-medium text-white">
            Biggest gainers
          </h2>
          <p className="mt-1 text-sm text-vitae-gray">
            Top 250 coins by market cap, past {current.long}
          </p>
        </div>
        <div
          className="grid grid-cols-4 gap-1 rounded-full border border-white/15 p-1"
          role="group"
          aria-label="Gain window"
        >
          {windows.map((w) => {
            const active = w.key === win;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => setWin(w.key)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-vitae-green sm:text-sm motion-safe:transition-colors ${
                  active ? 'bg-vitae-green text-black' : 'text-vitae-gray hover:text-white'
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      {!available || !rows.length ? (
        <p className="mt-6 rounded-xl border border-white/15 px-4 py-8 text-center text-sm text-vitae-gray">
          Market data is unavailable right now. It refreshes every 15 minutes.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-left">
          <caption className="sr-only">Top ten coins by percent gain over {current.long}</caption>
          <thead>
            <tr className="border-b border-white/20 text-xs text-vitae-gray">
              <th scope="col" className="w-6 py-2 pr-2 font-normal sm:w-8">
                #
              </th>
              <th scope="col" className="py-2 pr-2 font-normal">
                Coin
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-normal">
                Price
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Gain
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={c.id}
                className={`${styles.row} border-b border-white/10 hover:bg-white/[0.04]`}
              >
                <td className="py-3 pr-2 text-xs text-vitae-gray sm:text-sm">{i + 1}</td>
                <td className="py-3 pr-2">
                  <span className="block text-sm font-medium text-white sm:text-base">
                    {c.symbol}
                  </span>
                  <span className="block text-xs leading-tight text-vitae-gray sm:text-sm">
                    {c.name}
                    {c.rank ? <span className="text-white/40"> · #{c.rank}</span> : null}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 pr-2 text-right text-sm text-white sm:text-base">
                  {price(c.price)}
                </td>
                <td
                  className={`whitespace-nowrap py-3 text-right text-sm font-medium sm:text-base ${c.change[win]! >= 0 ? 'text-vitae-green' : 'text-vitae-red'}`}
                >
                  {gain(c.change[win]!)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
