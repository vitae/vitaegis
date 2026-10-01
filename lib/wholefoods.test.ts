import { describe, expect, it } from 'vitest';
import {
  activeItems,
  addItem,
  amazonAddToCartUrl,
  amazonAddUrl,
  amazonSearchUrl,
  cartable,
  completeTrip,
  defaultState,
  formatStamp,
  listAsText,
  loadState,
  mergeStaples,
  mergeStates,
  qtyNumber,
  retiredItems,
  retireItem,
  restoreItem,
  setItemStatus,
  suggestions,
  summarize,
  toggleOut,
  touch,
  visitLog,
  type ListState,
} from './wholefoods';
import { PAST_VISITS, STAPLES } from './wholefoods-staples';

const NOW = '2026-10-01T17:45:00.000Z';

describe('amazonSearchUrl', () => {
  it('searches the Whole Foods storefront on Amazon for the item', () => {
    const url = amazonSearchUrl('Wild salmon fillet');
    expect(url.startsWith('https://www.amazon.com/s?')).toBe(true);
    expect(url).toContain('k=Wild+salmon+fillet');
    expect(url).toContain('i=wholefoods');
    expect(url).toContain('almBrandId=VUZHIFdob2xlIEZvb2Rz');
  });
});

describe('add to cart links', () => {
  it('builds a multi-item Amazon add-to-cart link with quantities', () => {
    const url = amazonAddToCartUrl([
      { asin: 'B005M4AMYI', qty: '2' },
      { asin: 'B001O8NQUS', qty: '1 bunch' },
    ]);
    expect(url.startsWith('https://www.amazon.com/gp/aws/cart/add.html?')).toBe(true);
    expect(url).toContain('ASIN.1=B005M4AMYI&Quantity.1=2');
    expect(url).toContain('ASIN.2=B001O8NQUS&Quantity.2=1');
  });

  it('qtyNumber reads a leading count and defaults to 1', () => {
    expect(qtyNumber('2')).toBe(2);
    expect(qtyNumber('12 pack')).toBe(12);
    expect(qtyNumber('a few')).toBe(1);
    expect(qtyNumber('0')).toBe(1);
  });

  it('amazonAddUrl goes to the cart when the ASIN is known, else to a storefront search', () => {
    const s = defaultState();
    const pb = s.items.find((i) => i.id === 'pb-cups')!;
    expect(pb.asin).toBe('B005M4AMYI');
    expect(amazonAddUrl(pb)).toContain('cart/add.html');
    const hot = s.items.find((i) => i.id === 'hot-bar')!;
    expect(hot.asin).toBeUndefined();
    expect(amazonAddUrl(hot)).toContain('/s?k=hot+bar');
  });

  it('cartable lists out items that have an ASIN', () => {
    let s = toggleOut(defaultState(), 'pb-cups', NOW);
    s = toggleOut(s, 'hot-bar', NOW);
    expect(cartable(s).map((i) => i.id)).toEqual(['pb-cups']);
  });

  it('mergeStaples backfills ASINs on lists saved before they existed', () => {
    const saved = JSON.stringify({
      items: [
        { id: 'limes', name: 'Limes', aisle: 'Produce', qty: '2', status: 'need', staple: true },
      ],
      trips: [],
    });
    expect(loadState(saved).items.find((i) => i.id === 'limes')?.asin).toBe('B07811WM8Z');
  });
});

describe('retire and restore (the red ✕)', () => {
  it('takes a staple off the standard list but keeps it for restoring', () => {
    const s = retireItem(toggleOut(defaultState(), 'pb-cups', NOW), 'pb-cups');
    const pb = s.items.find((i) => i.id === 'pb-cups')!;
    expect(pb.retired).toBe(true);
    expect(pb.status).toBe('stocked');
    expect(activeItems(s).some((i) => i.id === 'pb-cups')).toBe(false);
    expect(retiredItems(s).map((i) => i.id)).toEqual(['pb-cups']);
    expect(suggestions(s, 50).some((i) => i.id === 'pb-cups')).toBe(false);
    expect(cartable(s)).toEqual([]);
    expect(summarize(s).total).toBe(STAPLES.length - 1);
    expect(listAsText(s)).toBe('');
  });

  it('restore puts it back', () => {
    const s = restoreItem(retireItem(defaultState(), 'limes'), 'limes');
    expect(s.items.find((i) => i.id === 'limes')?.retired).toBeUndefined();
    expect(activeItems(s).length).toBe(STAPLES.length);
  });

  it('deletes non-staples outright', () => {
    const s = addItem(defaultState(), { name: 'Poke', aisle: 'Prepared', qty: '1' }, NOW);
    const id = s.items[s.items.length - 1].id;
    expect(retireItem(s, id).items.some((i) => i.id === id)).toBe(false);
  });

  it('survives a save and load', () => {
    const s = loadState(JSON.stringify(retireItem(defaultState(), 'eggs')));
    expect(s.items.find((i) => i.id === 'eggs')?.retired).toBe(true);
    expect(s.items.length).toBe(STAPLES.length);
  });
});

describe('defaultState', () => {
  it('seeds the inventory with every staple, all stocked', () => {
    const s = defaultState();
    expect(s.items.length).toBe(STAPLES.length);
    expect(s.items.every((i) => i.staple && i.status === 'stocked')).toBe(true);
    expect(s.items[0].timesBought).toBeGreaterThan(s.items[s.items.length - 1].timesBought ?? 0);
  });
});

describe('setItemStatus', () => {
  const base: ListState = {
    items: defaultState()
      .items.slice(0, 2)
      .map((i) => ({ ...i, status: 'need' })),
    trips: [],
  };

  it('stamps the time an item is marked in the cart', () => {
    const next = setItemStatus(base, base.items[0].id, 'cart', NOW);
    expect(next.items[0].status).toBe('cart');
    expect(next.items[0].checkedAt).toBe(NOW);
    expect(next.items[1].status).toBe('need');
  });

  it('records last bought when an item is marked stocked and clears the cart stamp', () => {
    const inCart = setItemStatus(base, base.items[0].id, 'cart', NOW);
    const later = '2026-10-01T18:10:00.000Z';
    const next = setItemStatus(inCart, base.items[0].id, 'stocked', later);
    expect(next.items[0].status).toBe('stocked');
    expect(next.items[0].lastBoughtAt).toBe(later);
    expect(next.items[0].checkedAt).toBeUndefined();
  });

  it('does not mutate the previous state', () => {
    setItemStatus(base, base.items[0].id, 'cart', NOW);
    expect(base.items[0].status).toBe('need');
  });
});

describe('toggleOut (the red ✕)', () => {
  it('flips a stocked staple to out and back', () => {
    const s = defaultState();
    const id = s.items[0].id;
    const out = toggleOut(s, id, NOW);
    expect(out.items[0].status).toBe('need');
    const back = toggleOut(out, id, NOW);
    expect(back.items[0].status).toBe('stocked');
  });

  it('sends a cart item back to out', () => {
    const s = setItemStatus(defaultState(), 'pb-cups', 'cart', NOW);
    expect(toggleOut(s, 'pb-cups').items.find((i) => i.id === 'pb-cups')?.status).toBe('need');
  });
});

describe('completeTrip', () => {
  it('logs the visit with kind, total, note and item names', () => {
    let s = setItemStatus(defaultState(), 'pb-cups', 'cart', '2026-10-01T17:30:00.000Z');
    s = setItemStatus(s, 'limes', 'cart', NOW);
    const done = completeTrip(s, '2026-10-01T18:00:00.000Z', {
      kind: 'store',
      total: 12.34,
      note: 'quick run',
    });
    expect(done.trips).toHaveLength(1);
    expect(done.trips[0]).toMatchObject({
      startedAt: '2026-10-01T17:30:00.000Z',
      completedAt: '2026-10-01T18:00:00.000Z',
      items: 2,
      names: ["Justin's PB cups", 'Limes'],
      kind: 'store',
      total: 12.34,
      note: 'quick run',
    });
    expect(done.items.find((i) => i.id === 'limes')?.status).toBe('stocked');
  });

  it('is a no-op with an empty cart', () => {
    const s = defaultState();
    expect(completeTrip(s, NOW)).toBe(s);
  });
});

describe('suggestions', () => {
  it('ranks stocked staples by how often they were bought and skips items already listed', () => {
    const s = toggleOut(defaultState(), 'pb-cups', NOW);
    const top = suggestions(s, 3);
    expect(top.map((i) => i.id)).not.toContain('pb-cups');
    expect(top[0].id).toBe('reeds-ginger-brew');
    expect(top).toHaveLength(3);
  });
});

describe('visitLog', () => {
  it('merges logged trips with the Amazon history, newest first', () => {
    const s = completeTrip(setItemStatus(defaultState(), 'limes', 'cart', NOW), NOW);
    const log = visitLog(s);
    expect(log[0].source).toBe('logged');
    expect(log[1].source).toBe('amazon');
    expect(log.length).toBe(PAST_VISITS.length + 1);
    for (let i = 1; i < log.length; i++) {
      expect(Date.parse(log[i - 1].at)).toBeGreaterThanOrEqual(Date.parse(log[i].at));
    }
  });
});

describe('mergeStates', () => {
  const t1 = '2026-10-01T10:00:00.000Z';
  const t2 = '2026-10-01T11:00:00.000Z';

  it('keeps local when there is no cloud copy', () => {
    const local = touch(defaultState(), t1);
    expect(mergeStates(local, null)).toBe(local);
  });

  it('takes items from whichever copy changed last', () => {
    const local = touch(toggleOut(defaultState(), 'limes', t1), t1);
    const cloud = touch(toggleOut(defaultState(), 'pb-cups', t2), t2);
    const merged = mergeStates(local, cloud);
    expect(merged.items.find((i) => i.id === 'pb-cups')?.status).toBe('need');
    expect(merged.items.find((i) => i.id === 'limes')?.status).toBe('stocked');
    expect(merged.updatedAt).toBe(t2);

    const other = mergeStates(cloud, local);
    expect(other.items.find((i) => i.id === 'pb-cups')?.status).toBe('need');
  });

  it('unions trips logged on both devices, newest first, without duplicates', () => {
    const a = completeTrip(setItemStatus(defaultState(), 'limes', 'cart', t1), t1);
    const b = completeTrip(setItemStatus(defaultState(), 'eggs', 'cart', t2), t2);
    const merged = mergeStates(touch(a, t1), touch(b, t2));
    expect(merged.trips.map((t) => t.startedAt)).toEqual([t2, t1]);
    expect(mergeStates(merged, merged).trips).toHaveLength(2);
  });

  it('loadState keeps updatedAt', () => {
    const s = loadState(JSON.stringify(touch(defaultState(), t1)));
    expect(s.updatedAt).toBe(t1);
  });
});

describe('summarize', () => {
  it('counts items by status', () => {
    const s: ListState = {
      items: [
        { id: 'a', name: 'A', aisle: 'Produce', qty: '1', status: 'need' },
        { id: 'b', name: 'B', aisle: 'Produce', qty: '1', status: 'cart' },
        { id: 'c', name: 'C', aisle: 'Produce', qty: '1', status: 'stocked' },
        { id: 'd', name: 'D', aisle: 'Produce', qty: '1', status: 'need' },
      ],
      trips: [],
    };
    expect(summarize(s)).toEqual({ need: 2, cart: 1, stocked: 1, total: 4 });
  });
});

describe('formatStamp', () => {
  it('renders a short date and time', () => {
    const out = formatStamp(NOW, 'UTC');
    expect(out).toMatch(/Oct 1/);
    expect(out).toMatch(/5:45/);
  });
});

describe('loadState', () => {
  it('falls back to the staples when nothing is saved', () => {
    const s = loadState(null);
    expect(s.items.length).toBe(STAPLES.length);
    expect(s.trips).toEqual([]);
  });

  it('ignores corrupt saved data', () => {
    expect(loadState('{not json').items.length).toBe(STAPLES.length);
    expect(loadState('{"items": "nope"}').items.length).toBe(STAPLES.length);
  });

  it('restores saved items and trips and fills in any missing staples', () => {
    const saved = JSON.stringify({
      items: [
        { id: 'x', name: 'Kefir', aisle: 'Dairy & Eggs', qty: '1', status: 'cart', checkedAt: NOW },
      ],
      trips: [{ id: 't1', startedAt: NOW, items: 3 }],
    });
    const s = loadState(saved);
    expect(s.items[0].name).toBe('Kefir');
    expect(s.items.length).toBe(STAPLES.length + 1);
    expect(s.trips[0].items).toBe(3);
  });

  it('mergeStaples keeps a complete list untouched', () => {
    const s = defaultState();
    expect(mergeStaples(s)).toBe(s);
  });
});
