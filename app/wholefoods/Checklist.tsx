'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addItem,
  AISLES,
  AMAZON_CART,
  AMAZON_ORDERS,
  amazonSearchUrl,
  completeTrip,
  defaultState,
  formatStamp,
  listAsText,
  loadState,
  removeItem,
  restockAll,
  setItemStatus,
  STORAGE_KEY,
  summarize,
  WFM_STOREFRONT,
  type Aisle,
  type Item,
  type ListState,
  type Status,
} from '@/lib/wholefoods';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const pill =
  'rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors';
const AMAZON = '#FF9900';

const NEXT: Record<Status, Status> = { need: 'cart', cart: 'stocked', stocked: 'need' };
const STATUS_LABEL: Record<Status, string> = { need: 'Need', cart: 'In cart', stocked: 'Stocked' };

export default function Checklist() {
  const [state, setState] = useState<ListState>(defaultState);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<{ name: string; aisle: Aisle; qty: string }>({
    name: '',
    aisle: 'Produce',
    qty: '1',
  });

  // Load once on the client; the server render shows the default list.
  useEffect(() => {
    try {
      setState(loadState(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* private mode or blocked storage: keep the defaults in memory */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const counts = useMemo(() => summarize(state), [state]);
  const visible = filter === 'all' ? state.items : state.items.filter((i) => i.status === filter);
  const byAisle = AISLES.map((aisle) => ({
    aisle,
    items: visible.filter((i) => i.aisle === aisle),
  })).filter((g) => g.items.length > 0);

  const cycle = (item: Item) => setState((s) => setItemStatus(s, item.id, NEXT[item.status]));

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(state));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => addItem(s, draft));
    setDraft((d) => ({ ...d, name: '', qty: '1' }));
  };

  return (
    <div className="space-y-8">
      {/* Amazon account links */}
      <section className={`${glass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={label}>Your Amazon account</p>
            <p className="mt-2 text-sm font-light text-white/70">
              Whole Foods delivery and pickup run through Amazon. These open your own signed-in
              session.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={WFM_STOREFRONT}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-90"
              style={{ backgroundColor: AMAZON }}
            >
              Whole Foods on Amazon
            </a>
            <a
              href={AMAZON_CART}
              target="_blank"
              rel="noopener noreferrer"
              className={`${pill} border-white/20 text-white/80 hover:border-white/50 hover:text-white`}
            >
              Cart
            </a>
            <a
              href={AMAZON_ORDERS}
              target="_blank"
              rel="noopener noreferrer"
              className={`${pill} border-white/20 text-white/80 hover:border-white/50 hover:text-white`}
            >
              Orders
            </a>
          </div>
        </div>
      </section>

      {/* Status summary and controls */}
      <section className={`${glass} p-6 sm:p-8`}>
        <div className="grid grid-cols-3 gap-3 text-center">
          {(['need', 'cart', 'stocked'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-xl border py-4 transition-colors ${
                filter === s
                  ? 'border-vitae-green bg-vitae-green/10'
                  : 'border-white/10 hover:border-vitae-green/40'
              }`}
            >
              <div className="text-3xl font-bold text-vitae-green">{counts[s]}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
                {STATUS_LABEL[s]}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setState((s) => completeTrip(s))}
            disabled={counts.cart === 0}
            className={`${pill} border-vitae-green/60 text-vitae-green hover:bg-vitae-green/10 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Finish trip · stamp {counts.cart} item{counts.cart === 1 ? '' : 's'}
          </button>
          <button
            type="button"
            onClick={copyList}
            className={`${pill} border-white/20 text-white/80 hover:border-white/50 hover:text-white`}
          >
            {copied ? 'Copied' : 'Copy list for Alexa'}
          </button>
          <button
            type="button"
            onClick={() => setState((s) => restockAll(s))}
            disabled={counts.stocked === 0}
            className={`${pill} border-white/20 text-white/60 hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Reset stocked → need
          </button>
        </div>
      </section>

      {/* The list */}
      {byAisle.length === 0 && (
        <p className="text-center font-light text-white/50">Nothing here. Change the filter.</p>
      )}
      {byAisle.map(({ aisle, items }) => (
        <section key={aisle} className={`${glass} p-6 sm:p-8`}>
          <h2 className={label}>{aisle}</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => cycle(item)}
                  aria-label={`${item.name}: ${STATUS_LABEL[item.status]}. Tap to change.`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm transition-colors ${
                    item.status === 'stocked'
                      ? 'border-vitae-green bg-vitae-green text-black'
                      : item.status === 'cart'
                        ? 'border-vitae-green text-vitae-green'
                        : 'border-white/30 text-transparent hover:border-vitae-green/60'
                  }`}
                >
                  {item.status === 'stocked' ? '✓' : item.status === 'cart' ? '●' : '·'}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span
                      className={`font-medium ${
                        item.status === 'stocked' ? 'text-white/40 line-through' : 'text-white'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-white/50">{item.qty}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/45">
                    {item.status === 'cart' && item.checkedAt && (
                      <span>In cart {formatStamp(item.checkedAt)}</span>
                    )}
                    {item.status === 'stocked' && item.lastBoughtAt && (
                      <span>Bought {formatStamp(item.lastBoughtAt)}</span>
                    )}
                    {item.status === 'need' && item.lastBoughtAt && (
                      <span>Last bought {formatStamp(item.lastBoughtAt)}</span>
                    )}
                    {item.status === 'need' && !item.lastBoughtAt && <span>Never bought</span>}
                  </div>
                </div>

                <a
                  href={amazonSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-[#FF9900]/10"
                  style={{ borderColor: `${AMAZON}80`, color: AMAZON }}
                >
                  Amazon
                </a>
                <button
                  type="button"
                  onClick={() => setState((s) => removeItem(s, item.id))}
                  aria-label={`Remove ${item.name}`}
                  className="shrink-0 px-1 text-white/30 transition-colors hover:text-vitae-red"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Add item */}
      <section className={`${glass} p-6 sm:p-8`}>
        <h2 className={label}>Add to the list</h2>
        <form onSubmit={submitDraft} className="mt-4 flex flex-wrap gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Item"
            aria-label="Item name"
            className="min-w-[10rem] flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
          />
          <input
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            placeholder="Qty"
            aria-label="Quantity"
            className="w-24 rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
          />
          <select
            value={draft.aisle}
            onChange={(e) => setDraft({ ...draft, aisle: e.target.value as Aisle })}
            aria-label="Aisle"
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white focus:border-vitae-green focus:outline-none"
          >
            {AISLES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={`${pill} border-vitae-green/60 text-vitae-green hover:bg-vitae-green/10`}
          >
            Add
          </button>
        </form>
      </section>

      {/* Trip log */}
      <section className={`${glass} p-6 sm:p-8`}>
        <h2 className={label}>Trip log</h2>
        {state.trips.length === 0 ? (
          <p className="mt-3 text-sm font-light text-white/50">
            No trips yet. Put items in the cart, then finish the trip to stamp it.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 text-sm">
            {state.trips.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-white/85">
                  {formatStamp(t.startedAt)}
                  {t.completedAt && t.completedAt !== t.startedAt && (
                    <span className="text-white/45"> → {formatStamp(t.completedAt)}</span>
                  )}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-vitae-green">
                  {t.items} item{t.items === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
