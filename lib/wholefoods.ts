/* ═══════════════════════════════════════════════════════════════════════════════
   Whole Foods grocery checklist · pure logic
   The page at /wholefoods keeps its state in the browser (localStorage) and links
   every item into the Whole Foods Market storefront on Amazon, where the visitor's
   own Amazon session handles cart and checkout. The inventory of staples comes from
   the household's own Whole Foods order history (lib/wholefoods-staples.ts).
   ═══════════════════════════════════════════════════════════════════════════════ */

import { ASINS, PAST_VISITS, STAPLES, type PastVisit } from './wholefoods-staples';

/** stocked = we have it · need = we're out (the red ✕) · cart = picked up this trip */
export type Status = 'need' | 'cart' | 'stocked';

export type Aisle =
  | 'Produce'
  | 'Meat'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Prepared'
  | 'Pantry'
  | 'Snacks'
  | 'Frozen'
  | 'Drinks'
  | 'Household';

export const AISLES: Aisle[] = [
  'Produce',
  'Meat',
  'Dairy & Eggs',
  'Bakery',
  'Prepared',
  'Pantry',
  'Snacks',
  'Frozen',
  'Drinks',
  'Household',
];

export type Item = {
  id: string;
  name: string;
  aisle: Aisle;
  qty: string;
  status: Status;
  /** True for the "we always get this" inventory, seeded from order history. */
  staple?: boolean;
  /** What to search for on Amazon; defaults to the name. */
  search?: string;
  /** Amazon ASIN of the Whole Foods listing, when known; enables one-tap add to cart. */
  asin?: string;
  /** Trips in the order history that included this item. */
  timesBought?: number;
  avgPrice?: number | null;
  /** ISO time the item was last marked "in cart". Cleared when it becomes stocked. */
  checkedAt?: string;
  /** ISO time the item was last marked "stocked" (bought). */
  lastBoughtAt?: string;
};

export type Trip = {
  id: string;
  startedAt: string;
  completedAt?: string;
  /** How many items were bought on this trip. */
  items: number;
  /** Names of what was bought, for the visit log. */
  names?: string[];
  kind?: 'store' | 'delivery';
  total?: number;
  note?: string;
};

export type ListState = {
  items: Item[];
  trips: Trip[];
  /** ISO time of the last change on any device; drives last-write-wins when syncing. */
  updatedAt?: string;
};

export const STORAGE_KEY = 'vitaegis.wholefoods.v2';

/** Whole Foods Market's storefront id on Amazon. */
export const WFM_BRAND_ID = 'VUZHIFdob2xlIEZvb2Rz';
export const WFM_STOREFRONT = `https://www.amazon.com/alm/storefront?almBrandId=${WFM_BRAND_ID}`;
export const AMAZON_CART = 'https://www.amazon.com/gp/cart/view.html';
export const AMAZON_ORDERS = 'https://www.amazon.com/gp/css/order-history';
export const AMAZON_ACCOUNT = 'https://www.amazon.com/gp/css/homepage.html';

/** Search the Whole Foods storefront on Amazon for an item. */
export function amazonSearchUrl(name: string): string {
  const q = new URLSearchParams({ k: name, i: 'wholefoods', almBrandId: WFM_BRAND_ID });
  return `https://www.amazon.com/s?${q.toString()}`;
}

/** "2", "2 bottles", "1 bunch" → 2, 2, 1. Anything else → 1. */
export function qtyNumber(qty: string): number {
  const n = parseInt(qty, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;
}

/**
 * Amazon's add-to-cart link: opening it in the shopper's own signed-in browser puts the
 * listed ASINs in their cart. Several items go in one link.
 */
export function amazonAddToCartUrl(items: { asin: string; qty?: string }[]): string {
  const q = new URLSearchParams();
  items.forEach((it, i) => {
    q.set(`ASIN.${i + 1}`, it.asin);
    q.set(`Quantity.${i + 1}`, String(qtyNumber(it.qty ?? '1')));
  });
  return `https://www.amazon.com/gp/aws/cart/add.html?${q.toString()}`;
}

/** Where the + button should send the shopper: straight into the cart when the ASIN is known. */
export function amazonAddUrl(item: Pick<Item, 'asin' | 'qty' | 'search' | 'name'>): string {
  return item.asin
    ? amazonAddToCartUrl([{ asin: item.asin, qty: item.qty }])
    : amazonSearchUrl(item.search ?? item.name);
}

/** Everything marked out that has a known ASIN, ready for one add-all link. */
export function cartable(state: ListState): Item[] {
  return state.items.filter((i) => i.status === 'need' && i.asin);
}

export function stapleItem(id: string): Item | undefined {
  const s = STAPLES.find((x) => x.id === id);
  if (!s) return undefined;
  return {
    id: s.id,
    name: s.name,
    aisle: s.aisle,
    qty: s.qty,
    status: 'stocked',
    staple: true,
    search: s.search,
    ...(ASINS[s.id] ? { asin: ASINS[s.id] } : {}),
    timesBought: s.timesBought,
    avgPrice: s.avgPrice,
    lastBoughtAt: s.lastBoughtAt,
  };
}

/** Every staple starts out stocked; mark the red ✕ on whatever is actually out. */
export function defaultState(): ListState {
  return { items: STAPLES.map((s) => stapleItem(s.id)!), trips: [] };
}

const STATUSES: Status[] = ['need', 'cart', 'stocked'];

function isItem(v: unknown): v is Item {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.aisle === 'string' &&
    typeof o.qty === 'string' &&
    STATUSES.includes(o.status as Status)
  );
}

function isTrip(v: unknown): v is Trip {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.startedAt === 'string' && typeof o.items === 'number';
}

/** Any staple missing from a saved list is added (stocked), so new staples show up. */
export function mergeStaples(state: ListState): ListState {
  const have = new Set(state.items.map((i) => i.id));
  const missing = STAPLES.filter((s) => !have.has(s.id)).map((s) => stapleItem(s.id)!);
  // Saved lists from before ASINs existed pick them up here.
  const needsAsin = state.items.some((i) => !i.asin && ASINS[i.id]);
  if (missing.length === 0 && !needsAsin) return state;
  const items = state.items.map((i) => (!i.asin && ASINS[i.id] ? { ...i, asin: ASINS[i.id] } : i));
  return { ...state, items: [...items, ...missing] };
}

/** Parses saved JSON; anything malformed falls back to the default list. */
export function loadState(raw: string | null): ListState {
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as { items?: unknown; trips?: unknown; updatedAt?: unknown };
    if (!Array.isArray(parsed.items)) return defaultState();
    const items = parsed.items.filter(isItem);
    const trips = Array.isArray(parsed.trips) ? parsed.trips.filter(isTrip) : [];
    const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined;
    return mergeStaples({ items, trips, ...(updatedAt ? { updatedAt } : {}) });
  } catch {
    return defaultState();
  }
}

function withoutCheckedAt(item: Item): Item {
  const copy = { ...item };
  delete copy.checkedAt;
  return copy;
}

export function setItemStatus(
  state: ListState,
  id: string,
  status: Status,
  now: string = new Date().toISOString(),
): ListState {
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== id) return item;
      if (status === 'cart') return { ...item, status, checkedAt: now };
      if (status === 'stocked') return { ...withoutCheckedAt(item), status, lastBoughtAt: now };
      return { ...withoutCheckedAt(item), status };
    }),
  };
}

/** The red ✕: flip a staple between stocked and out (need). Cart items go back to out. */
export function toggleOut(state: ListState, id: string, now?: string): ListState {
  const item = state.items.find((i) => i.id === id);
  if (!item) return state;
  return setItemStatus(state, id, item.status === 'need' ? 'stocked' : 'need', now);
}

export function addItem(
  state: ListState,
  input: { name: string; aisle: Aisle; qty: string },
  now: string = new Date().toISOString(),
): ListState {
  const name = input.name.trim();
  if (!name) return state;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `${slug}-${Date.parse(now).toString(36)}`;
  return {
    ...state,
    items: [
      ...state.items,
      { id, name, aisle: input.aisle, qty: input.qty.trim() || '1', status: 'need' },
    ],
  };
}

export function removeItem(state: ListState, id: string): ListState {
  return { ...state, items: state.items.filter((i) => i.id !== id) };
}

/** Everything in the cart becomes stocked and the visit is logged with its date, time and note. */
export function completeTrip(
  state: ListState,
  now: string = new Date().toISOString(),
  extra: { kind?: 'store' | 'delivery'; total?: number; note?: string } = {},
): ListState {
  const bought = state.items.filter((i) => i.status === 'cart');
  if (bought.length === 0) return state;
  const items = state.items.map((i) =>
    i.status === 'cart'
      ? { ...withoutCheckedAt(i), status: 'stocked' as Status, lastBoughtAt: now }
      : i,
  );
  const startedAt = bought.map((i) => i.checkedAt ?? now).sort()[0];
  const trip: Trip = {
    id: `trip-${Date.parse(now).toString(36)}`,
    startedAt,
    completedAt: now,
    items: bought.length,
    names: bought.map((i) => i.name),
    kind: extra.kind ?? 'store',
    ...(extra.total !== undefined && Number.isFinite(extra.total) ? { total: extra.total } : {}),
    ...(extra.note?.trim() ? { note: extra.note.trim() } : {}),
  };
  return { items, trips: [trip, ...state.trips].slice(0, 200) };
}

/** Stocked items go back on the list. Use it when the fridge is empty again. */
export function restockAll(state: ListState): ListState {
  return {
    ...state,
    items: state.items.map((i) => (i.status === 'stocked' ? { ...i, status: 'need' } : i)),
  };
}

/** Stamp a change so the other device knows which copy is newer. */
export function touch(state: ListState, now: string = new Date().toISOString()): ListState {
  return { ...state, updatedAt: now };
}

/**
 * Reconcile the local copy with the cloud copy. Items come from whichever copy changed
 * last; trips are the union of both (a visit logged on either device is never lost).
 */
export function mergeStates(local: ListState, cloud: ListState | null): ListState {
  if (!cloud) return local;
  const lt = Date.parse(local.updatedAt ?? '') || 0;
  const ct = Date.parse(cloud.updatedAt ?? '') || 0;
  const newer = ct > lt ? cloud : local;
  const seen = new Set<string>();
  const trips = [...local.trips, ...cloud.trips]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, 200);
  return mergeStaples({ items: newer.items, trips, updatedAt: newer.updatedAt });
}

export function summarize(state: ListState): Record<Status | 'total', number> {
  const out = { need: 0, cart: 0, stocked: 0, total: state.items.length };
  for (const i of state.items) out[i.status] += 1;
  return out;
}

/**
 * Buy-again suggestions: staples ranked by how often they were bought, most popular
 * first. Items already out or in the cart are left out, since they are on the list.
 */
export function suggestions(state: ListState, limit = 12): Item[] {
  return state.items
    .filter((i) => i.staple && i.status === 'stocked')
    .sort((a, b) => (b.timesBought ?? 0) - (a.timesBought ?? 0))
    .slice(0, limit);
}

export type VisitEntry = {
  id: string;
  at: string;
  endedAt?: string;
  kind: 'store' | 'delivery';
  total?: number;
  items: number;
  names?: string[];
  note?: string;
  source: 'logged' | 'amazon';
};

/** Trips logged on this device merged with the Amazon order history, newest first. */
export function visitLog(state: ListState, history: PastVisit[] = PAST_VISITS): VisitEntry[] {
  const logged: VisitEntry[] = state.trips.map((t) => ({
    id: t.id,
    at: t.startedAt,
    endedAt: t.completedAt,
    kind: t.kind ?? 'store',
    total: t.total,
    items: t.items,
    names: t.names,
    note: t.note,
    source: 'logged',
  }));
  const past: VisitEntry[] = history.map((v) => ({
    id: v.id,
    at: v.at,
    kind: v.kind,
    total: v.total,
    items: v.items,
    source: 'amazon',
  }));
  return [...logged, ...past].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Short date and time, e.g. "Oct 1, 5:45 PM". */
export function formatStamp(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

/** Date with year, e.g. "Sep 26, 2026". */
export function formatDate(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  });
}

/** Plain-text copy of what still needs buying, for pasting into the Alexa shopping list. */
export function listAsText(state: ListState): string {
  return state.items
    .filter((i) => i.status !== 'stocked')
    .map((i) => `${i.name} × ${i.qty}`)
    .join('\n');
}
