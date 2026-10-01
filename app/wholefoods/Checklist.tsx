'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  currentSession,
  loadCloud,
  onAuthChange,
  saveCloud,
  signInWithGoogle,
  signOut,
  subscribeCloud,
  syncConfigured,
} from '@/lib/wholefoods-cloud';
import {
  activeItems,
  addItem,
  AISLES,
  AMAZON_CART,
  AMAZON_ORDERS,
  amazonAddToCartUrl,
  amazonAddUrl,
  amazonSearchUrl,
  cartable,
  completeTrip,
  defaultState,
  formatDate,
  formatStamp,
  listAsText,
  loadState,
  mergeStates,
  restockAll,
  restoreItem,
  retiredItems,
  retireItem,
  setItemStatus,
  STORAGE_KEY,
  suggestions,
  summarize,
  toggleOut,
  touch,
  visitLog,
  WFM_STOREFRONT,
  type Aisle,
  type Item,
  type ListState,
  type Status,
} from '@/lib/wholefoods';
import { HISTORY_FROM, HISTORY_TO, TRIPS_ANALYZED } from '@/lib/wholefoods-staples';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const pill =
  'rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors';
const input =
  'rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none';
const AMAZON = '#FF9900';
const HST = 'Pacific/Honolulu';

const STATUS_LABEL: Record<Status, string> = { need: 'Out', cart: 'In cart', stocked: 'Stocked' };

export default function Checklist() {
  const [state, setState] = useState<ListState>(defaultState);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [trip, setTrip] = useState<{ kind: 'store' | 'delivery'; total: string; note: string }>({
    kind: 'store',
    total: '',
    note: '',
  });
  const [draft, setDraft] = useState<{ name: string; aisle: Aisle; qty: string }>({
    name: '',
    aisle: 'Produce',
    qty: '1',
  });
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [view, setView] = useState<'rank' | 'aisle'>('rank');

  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<{
    status: 'off' | 'idle' | 'saving' | 'synced' | 'error';
    at?: string;
    msg?: string;
  }>({ status: 'off' });
  // updatedAt of the last state we pushed to, or received from, the cloud (skips echo saves).
  const cloudStamp = useRef<string | undefined>(undefined);

  /** Every local change goes through here so it gets a fresh updatedAt for sync. */
  const change = (fn: (s: ListState) => ListState) =>
    setState((s) => {
      const next = fn(s);
      return next === s ? s : touch(next);
    });

  // Load once on the client; the server render shows the default inventory.
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

  // Who is signed in (Supabase). Null when sync isn't configured or nobody is signed in.
  useEffect(() => {
    if (!syncConfigured()) return;
    setSync({ status: 'idle' });
    void currentSession().then(setSession);
    return onAuthChange(setSession);
  }, []);

  // On sign-in: merge the cloud copy with this device, push the result, then follow live changes.
  useEffect(() => {
    if (!ready || !session) return;
    const userId = session.user.id;
    let alive = true;
    (async () => {
      try {
        const cloud = await loadCloud(userId);
        if (!alive) return;
        setState((local) => {
          const merged = mergeStates(local, cloud);
          cloudStamp.current = cloud?.updatedAt;
          return merged;
        });
        setSync({ status: 'synced', at: new Date().toISOString() });
      } catch (e) {
        if (alive)
          setSync({ status: 'error', msg: e instanceof Error ? e.message : 'sync failed' });
      }
    })();
    const unsubscribe = subscribeCloud(userId, (remote) => {
      if (remote.updatedAt && remote.updatedAt === cloudStamp.current) return;
      cloudStamp.current = remote.updatedAt;
      setState((local) => mergeStates(local, remote));
      setSync({ status: 'synced', at: new Date().toISOString() });
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [ready, session]);

  // Push local changes, debounced, whenever the state is newer than what the cloud has.
  useEffect(() => {
    if (!ready || !session || !state.updatedAt || state.updatedAt === cloudStamp.current) return;
    const userId = session.user.id;
    const stamp = state.updatedAt;
    const t = window.setTimeout(async () => {
      setSync({ status: 'saving' });
      try {
        await saveCloud(userId, state);
        cloudStamp.current = stamp;
        setSync({ status: 'synced', at: new Date().toISOString() });
      } catch (e) {
        setSync({ status: 'error', msg: e instanceof Error ? e.message : 'save failed' });
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [state, ready, session]);

  const counts = useMemo(() => summarize(state), [state]);
  const buyAgain = useMemo(() => suggestions(state, 12), [state]);
  const visits = useMemo(() => visitLog(state), [state]);
  const active = activeItems(state);
  const retired = retiredItems(state);
  const visible = filter === 'all' ? active : active.filter((i) => i.status === filter);
  const byAisle = AISLES.map((aisle) => ({
    aisle: aisle as string,
    items: visible.filter((i) => i.aisle === aisle),
  })).filter((g) => g.items.length > 0);
  const ranked = [...visible].sort(
    (a, b) =>
      (b.timesBought ?? 0) - (a.timesBought ?? 0) ||
      Date.parse(b.lastBoughtAt ?? '') - Date.parse(a.lastBoughtAt ?? ''),
  );
  const groups =
    view === 'rank'
      ? ranked.length
        ? [{ aisle: 'Ranked by how often we buy it', items: ranked }]
        : []
      : byAisle;

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(state));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const submitTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(trip.total);
    change((s) =>
      completeTrip(s, new Date().toISOString(), {
        kind: trip.kind,
        total: Number.isFinite(total) ? total : undefined,
        note: trip.note,
      }),
    );
    setTrip({ kind: 'store', total: '', note: '' });
    setFinishing(false);
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    change((s) => addItem(s, draft));
    setDraft((d) => ({ ...d, name: '', qty: '1' }));
  };

  const OutButton = ({ item }: { item: Item }) => (
    <button
      type="button"
      onClick={() => change((s) => toggleOut(s, item.id))}
      aria-label={`${item.name}: ${STATUS_LABEL[item.status]}. Tap to mark ${
        item.status === 'need' ? 'stocked' : 'out'
      }.`}
      title={
        item.status === 'need'
          ? 'We are out. Tap when restocked.'
          : 'We have it. Tap if we are out.'
      }
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-bold transition-all ${
        item.status === 'need'
          ? 'border-vitae-yellow bg-vitae-yellow/15 text-vitae-yellow shadow-[0_0_14px_rgba(255,255,0,0.35)]'
          : item.status === 'cart'
            ? 'border-vitae-green text-vitae-green'
            : 'border-vitae-green/60 bg-vitae-green/15 text-vitae-green hover:border-vitae-yellow hover:bg-vitae-yellow/10 hover:text-vitae-yellow'
      }`}
    >
      {item.status === 'need' ? '○' : item.status === 'cart' ? '●' : '✓'}
    </button>
  );

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
            {sync.status !== 'off' && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                {session ? (
                  <>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        sync.status === 'error'
                          ? 'bg-vitae-red'
                          : sync.status === 'saving'
                            ? 'bg-vitae-yellow animate-pulse'
                            : 'bg-vitae-green shadow-[0_0_8px_#00ff00]'
                      }`}
                    />
                    <span className="text-white/70">
                      Synced as {session.user.email}
                      {sync.status === 'saving' && ' · saving'}
                      {sync.status === 'synced' && sync.at && ` · ${formatStamp(sync.at)}`}
                      {sync.status === 'error' && (
                        <span className="text-vitae-red"> · {sync.msg}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="text-white/40 underline-offset-2 hover:text-white hover:underline"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void signInWithGoogle().then(
                        (err) => err && setSync({ status: 'error', msg: err }),
                      )
                    }
                    className={`${pill} border-vitae-green/60 text-vitae-green hover:bg-vitae-green/10`}
                  >
                    Sign in with Google · sync phone ↔ laptop
                  </button>
                )}
                {!session && sync.status === 'error' && (
                  <span className="text-vitae-red">{sync.msg}</span>
                )}
              </div>
            )}
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
              <div
                className={`text-3xl font-bold ${s === 'need' ? 'text-vitae-red' : 'text-vitae-green'}`}
              >
                {counts[s]}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
                {STATUS_LABEL[s]}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {cartable(state).length > 0 && (
            <a
              href={amazonAddToCartUrl(cartable(state).map((i) => ({ asin: i.asin!, qty: i.qty })))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                change((s) => cartable(s).reduce((acc, i) => setItemStatus(acc, i.id, 'cart'), s))
              }
              className={`${pill} border-vitae-green bg-vitae-green/15 text-vitae-green hover:bg-vitae-green hover:text-black`}
            >
              + Add all {cartable(state).length} out item{cartable(state).length === 1 ? '' : 's'}{' '}
              to Amazon cart
            </a>
          )}
          <button
            type="button"
            onClick={() => setFinishing((v) => !v)}
            disabled={counts.cart === 0}
            className={`${pill} border-vitae-green/60 text-vitae-green hover:bg-vitae-green/10 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Finish visit · {counts.cart} item{counts.cart === 1 ? '' : 's'}
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
            onClick={() => change((s) => restockAll(s))}
            disabled={counts.stocked === 0}
            className={`${pill} border-white/20 text-white/60 hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Mark everything out
          </button>
        </div>

        {finishing && (
          <form
            onSubmit={submitTrip}
            className="mt-5 flex flex-wrap items-end gap-2 border-t border-white/10 pt-5"
          >
            <div className="flex gap-1">
              {(['store', 'delivery'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTrip({ ...trip, kind: k })}
                  className={`${pill} ${
                    trip.kind === k
                      ? 'border-vitae-green bg-vitae-green/10 text-vitae-green'
                      : 'border-white/15 text-white/60'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <input
              value={trip.total}
              onChange={(e) => setTrip({ ...trip, total: e.target.value })}
              placeholder="Total $"
              inputMode="decimal"
              aria-label="Receipt total"
              className={`${input} w-28`}
            />
            <input
              value={trip.note}
              onChange={(e) => setTrip({ ...trip, note: e.target.value })}
              placeholder="Note (who went, what was missing…)"
              aria-label="Visit note"
              className={`${input} min-w-[12rem] flex-1`}
            />
            <button
              type="submit"
              className={`${pill} border-vitae-green bg-vitae-green/10 text-vitae-green hover:bg-vitae-green/20`}
            >
              Log visit now
            </button>
          </form>
        )}
      </section>

      {/* Buy again */}
      <section className={`${glass} p-6 sm:p-8`}>
        <h2 className={label}>Buy again · most popular</h2>
        <p className="mt-2 text-sm font-light text-white/60">
          Ranked by how many of the {TRIPS_ANALYZED} Whole Foods orders on the account (
          {formatDate(HISTORY_FROM)} to {formatDate(HISTORY_TO)}) included each item. Tap one to put
          it on the list.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {buyAgain.length === 0 && (
            <span className="text-sm font-light text-white/50">
              Everything popular is already on the list.
            </span>
          )}
          {buyAgain.map((i) => (
            <div
              key={i.id}
              className="flex items-stretch overflow-hidden rounded-xl border border-white/15 transition-colors hover:border-white/40"
            >
              <button
                type="button"
                onClick={() => change((s) => setItemStatus(s, i.id, 'need'))}
                title="Mark out"
                className="group px-3 py-2 text-left"
              >
                <span className="text-sm font-medium text-white group-hover:text-vitae-red">
                  ✕ {i.name}
                </span>
                <span className="ml-2 text-[11px] text-white/45">
                  {i.timesBought}× · last{' '}
                  {formatDate(i.lastBoughtAt ?? '', HST).replace(/, \d{4}$/, '')}
                </span>
              </button>
              <a
                href={amazonAddUrl(i)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => change((s) => setItemStatus(s, i.id, 'cart'))}
                aria-label={`Add ${i.name} to your Amazon cart`}
                title="Add to your Amazon cart"
                className="flex items-center border-l border-vitae-green/40 bg-vitae-green/10 px-3 text-lg font-bold text-vitae-green hover:bg-vitae-green hover:text-black"
              >
                +
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Inventory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 className={label}>Standard list · what we always get</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-white/45">
              <span className="text-vitae-green">✓</span> have it ·{' '}
              <span className="text-vitae-yellow">○</span> out ·{' '}
              <span className="text-vitae-green">+</span> to cart ·{' '}
              <span className="text-vitae-red">✕</span> don&apos;t get it anymore
            </span>
            <div className="flex gap-1">
              {(['rank', 'aisle'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    view === v
                      ? 'border-vitae-green bg-vitae-green/10 text-vitae-green'
                      : 'border-white/15 text-white/60 hover:border-white/40'
                  }`}
                >
                  {v === 'rank' ? 'By popularity' : 'By aisle'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {groups.length === 0 && (
          <p className="text-center font-light text-white/50">Nothing here. Change the filter.</p>
        )}
        {groups.map(({ aisle, items }) => (
          <div key={aisle} className={`${glass} p-5 sm:p-7`}>
            <h3 className={label}>{aisle}</h3>
            <ul className="mt-3 divide-y divide-white/10">
              {items.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  {view === 'rank' && (
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-white/35">
                      {idx + 1}
                    </span>
                  )}
                  <OutButton item={item} />
                  <a
                    href={amazonAddUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => change((s) => setItemStatus(s, item.id, 'cart'))}
                    aria-label={`Add ${item.name} to your Amazon cart`}
                    title={
                      item.asin
                        ? 'Add to your Amazon cart (Whole Foods)'
                        : 'Find it in the Whole Foods storefront on Amazon'
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-vitae-green/60 bg-vitae-green/10 text-xl font-bold leading-none text-vitae-green transition-all hover:bg-vitae-green hover:text-black hover:shadow-[0_0_14px_rgba(0,255,0,0.5)]"
                  >
                    +
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span
                        className={`font-medium ${
                          item.status === 'need' ? 'text-vitae-red' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-white/50">{item.qty}</span>
                      {item.timesBought ? (
                        <span className="text-[10px] uppercase tracking-[0.15em] text-white/35">
                          {item.timesBought}× bought
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/45">
                      {item.status === 'cart' && item.checkedAt && (
                        <span>In cart {formatStamp(item.checkedAt)}</span>
                      )}
                      {item.status !== 'cart' && item.lastBoughtAt && (
                        <span>Last bought {formatStamp(item.lastBoughtAt, HST)}</span>
                      )}
                      {item.status !== 'cart' && !item.lastBoughtAt && <span>Never bought</span>}
                      {item.avgPrice ? <span> · ~${item.avgPrice.toFixed(2)}</span> : null}
                    </div>
                  </div>
                  {item.status === 'need' && (
                    <button
                      type="button"
                      onClick={() => change((s) => setItemStatus(s, item.id, 'cart'))}
                      className="shrink-0 rounded-full border border-vitae-green/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-vitae-green hover:bg-vitae-green/10"
                    >
                      In cart
                    </button>
                  )}
                  {item.status === 'cart' && (
                    <button
                      type="button"
                      onClick={() => change((s) => setItemStatus(s, item.id, 'stocked'))}
                      className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:border-white/50"
                    >
                      Got it
                    </button>
                  )}
                  <a
                    href={amazonSearchUrl(item.search ?? item.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-[#FF9900]/10"
                    style={{ borderColor: `${AMAZON}80`, color: AMAZON }}
                  >
                    Amazon
                  </a>
                  <button
                    type="button"
                    onClick={() => change((s) => retireItem(s, item.id))}
                    aria-label={`Remove ${item.name} from the standard list`}
                    title="We don't get this anymore. Remove it from the standard list."
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-lg font-bold text-white/25 transition-all hover:border-vitae-red hover:bg-vitae-red/15 hover:text-vitae-red hover:shadow-[0_0_14px_rgba(255,0,0,0.45)]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {retired.length > 0 && (
          <div className={`${glass} p-5 sm:p-7`}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-red">
              Not anymore · removed from the standard list
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {retired.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => change((s) => restoreItem(s, item.id))}
                    title="Put it back on the standard list"
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 line-through transition-colors hover:border-vitae-green hover:text-vitae-green hover:no-underline"
                  >
                    {item.name} <span className="no-underline">↺</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Add item */}
      <section className={`${glass} p-6 sm:p-8`}>
        <h2 className={label}>Add something else</h2>
        <form onSubmit={submitDraft} className="mt-4 flex flex-wrap gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Item"
            aria-label="Item name"
            className={`${input} min-w-[10rem] flex-1`}
          />
          <input
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            placeholder="Qty"
            aria-label="Quantity"
            className={`${input} w-24`}
          />
          <select
            value={draft.aisle}
            onChange={(e) => setDraft({ ...draft, aisle: e.target.value as Aisle })}
            aria-label="Aisle"
            className={input}
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

      {/* Visit log */}
      <section className={`${glass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={label}>Every visit</h2>
          <span className="text-[11px] text-white/45">
            {visits.length} visits · {state.trips.length} logged here,{' '}
            {visits.length - state.trips.length} from Amazon
          </span>
        </div>
        <ul className="mt-4 divide-y divide-white/10 text-sm">
          {(showAllVisits ? visits : visits.slice(0, 12)).map((v) => (
            <li key={v.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-white/90">
                  {formatStamp(v.at, HST)}
                  {v.endedAt && v.endedAt !== v.at && (
                    <span className="text-white/45"> → {formatStamp(v.endedAt, HST)}</span>
                  )}
                  <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {v.kind}
                  </span>
                </span>
                <span className="text-xs text-white/70">
                  {v.items} item{v.items === 1 ? '' : 's'}
                  {v.total !== undefined && (
                    <span className="ml-2 text-vitae-green">${v.total.toFixed(2)}</span>
                  )}
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${
                      v.source === 'amazon'
                        ? 'border-[#FF9900]/50 text-[#FF9900]'
                        : 'border-vitae-green/50 text-vitae-green'
                    }`}
                  >
                    {v.source === 'amazon' ? 'Amazon' : 'logged'}
                  </span>
                </span>
              </div>
              {v.names && v.names.length > 0 && (
                <p className="mt-1 text-xs text-white/50">{v.names.join(' · ')}</p>
              )}
              {v.note && <p className="mt-1 text-xs italic text-white/60">{v.note}</p>}
            </li>
          ))}
        </ul>
        {visits.length > 12 && (
          <button
            type="button"
            onClick={() => setShowAllVisits((v) => !v)}
            className={`${pill} mt-4 border-white/20 text-white/70 hover:border-white/50 hover:text-white`}
          >
            {showAllVisits ? 'Show recent only' : `Show all ${visits.length}`}
          </button>
        )}
      </section>
    </div>
  );
}
