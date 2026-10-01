/* ═══════════════════════════════════════════════════════════════════════════════
   Whole Foods grocery checklist · pure logic
   The page at /wholefoods keeps its state in the browser (localStorage) and links
   every item into the Whole Foods Market storefront on Amazon, where the visitor's
   own Amazon session handles cart and checkout.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type Status = 'need' | 'cart' | 'stocked';

export type Aisle =
  | 'Produce'
  | 'Protein'
  | 'Dairy & Eggs'
  | 'Pantry'
  | 'Frozen'
  | 'Drinks'
  | 'Household';

export const AISLES: Aisle[] = [
  'Produce',
  'Protein',
  'Dairy & Eggs',
  'Pantry',
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
};

export type ListState = { items: Item[]; trips: Trip[] };

export const STORAGE_KEY = 'vitaegis.wholefoods.v1';

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

type Seed = Omit<Item, 'status'>;

export const DEFAULT_ITEMS: Seed[] = [
  { id: 'bananas', name: 'Bananas', aisle: 'Produce', qty: '1 bunch' },
  { id: 'blueberries', name: 'Organic blueberries', aisle: 'Produce', qty: '1 pint' },
  { id: 'avocados', name: 'Avocados', aisle: 'Produce', qty: '4' },
  { id: 'spinach', name: 'Baby spinach', aisle: 'Produce', qty: '1 bag' },
  { id: 'kale', name: 'Lacinato kale', aisle: 'Produce', qty: '1 bunch' },
  { id: 'sweet-potatoes', name: 'Sweet potatoes', aisle: 'Produce', qty: '3' },
  { id: 'garlic', name: 'Garlic', aisle: 'Produce', qty: '2 heads' },
  { id: 'ginger', name: 'Ginger root', aisle: 'Produce', qty: '1 piece' },
  { id: 'lemons', name: 'Lemons', aisle: 'Produce', qty: '4' },
  { id: 'salmon', name: 'Wild salmon fillet', aisle: 'Protein', qty: '1 lb' },
  { id: 'chicken-thighs', name: 'Organic chicken thighs', aisle: 'Protein', qty: '2 lb' },
  { id: 'sardines', name: 'Wild Planet sardines', aisle: 'Protein', qty: '3 tins' },
  { id: 'eggs', name: 'Pasture-raised eggs', aisle: 'Dairy & Eggs', qty: '1 dozen' },
  { id: 'greek-yogurt', name: 'Plain Greek yogurt', aisle: 'Dairy & Eggs', qty: '32 oz' },
  { id: 'kefir', name: 'Kefir', aisle: 'Dairy & Eggs', qty: '32 oz' },
  { id: 'butter', name: 'Grass-fed butter', aisle: 'Dairy & Eggs', qty: '1' },
  { id: 'oats', name: 'Rolled oats', aisle: 'Pantry', qty: '1 bag' },
  { id: 'brown-rice', name: 'Brown rice', aisle: 'Pantry', qty: '2 lb' },
  { id: 'lentils', name: 'Lentils', aisle: 'Pantry', qty: '1 lb' },
  { id: 'black-beans', name: '365 black beans', aisle: 'Pantry', qty: '4 cans' },
  { id: 'olive-oil', name: 'Extra virgin olive oil', aisle: 'Pantry', qty: '1 bottle' },
  { id: 'almond-butter', name: 'Almond butter', aisle: 'Pantry', qty: '1 jar' },
  { id: 'sauerkraut', name: 'Raw sauerkraut', aisle: 'Pantry', qty: '1 jar' },
  { id: 'dark-chocolate', name: 'Dark chocolate 85%', aisle: 'Pantry', qty: '2 bars' },
  { id: 'frozen-berries', name: 'Frozen mixed berries', aisle: 'Frozen', qty: '1 bag' },
  { id: 'frozen-broccoli', name: 'Frozen broccoli', aisle: 'Frozen', qty: '1 bag' },
  { id: 'green-tea', name: 'Green tea', aisle: 'Drinks', qty: '1 box' },
  { id: 'kombucha', name: 'Kombucha', aisle: 'Drinks', qty: '2 bottles' },
  { id: 'sparkling-water', name: 'Sparkling water', aisle: 'Drinks', qty: '12 pack' },
  { id: 'paper-towels', name: '365 paper towels', aisle: 'Household', qty: '1 pack' },
  { id: 'dish-soap', name: 'Dish soap', aisle: 'Household', qty: '1' },
];

export function defaultState(): ListState {
  return { items: DEFAULT_ITEMS.map((i) => ({ ...i, status: 'need' as Status })), trips: [] };
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

/** Parses saved JSON; anything malformed falls back to the default list. */
export function loadState(raw: string | null): ListState {
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as { items?: unknown; trips?: unknown };
    if (!Array.isArray(parsed.items)) return defaultState();
    const items = parsed.items.filter(isItem);
    const trips = Array.isArray(parsed.trips) ? parsed.trips.filter(isTrip) : [];
    return { items, trips };
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

/** Everything in the cart becomes stocked and the trip is logged with its date and time. */
export function completeTrip(state: ListState, now: string = new Date().toISOString()): ListState {
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
  };
  return { items, trips: [trip, ...state.trips].slice(0, 50) };
}

/** Stocked items go back on the list. Use it when the fridge is empty again. */
export function restockAll(state: ListState): ListState {
  return {
    ...state,
    items: state.items.map((i) => (i.status === 'stocked' ? { ...i, status: 'need' } : i)),
  };
}

export function summarize(state: ListState): Record<Status | 'total', number> {
  const out = { need: 0, cart: 0, stocked: 0, total: state.items.length };
  for (const i of state.items) out[i.status] += 1;
  return out;
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

/** Plain-text copy of what still needs buying, for pasting into the Alexa shopping list. */
export function listAsText(state: ListState): string {
  return state.items
    .filter((i) => i.status !== 'stocked')
    .map((i) => `${i.name} × ${i.qty}`)
    .join('\n');
}
