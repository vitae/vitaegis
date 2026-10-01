import { describe, expect, it } from 'vitest';
import {
  amazonSearchUrl,
  DEFAULT_ITEMS,
  formatStamp,
  loadState,
  setItemStatus,
  summarize,
  type ListState,
} from './wholefoods';

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

describe('setItemStatus', () => {
  const base: ListState = {
    items: DEFAULT_ITEMS.slice(0, 2).map((i) => ({ ...i, status: 'need' })),
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
  it('falls back to the default list when nothing is saved', () => {
    const s = loadState(null);
    expect(s.items.length).toBe(DEFAULT_ITEMS.length);
    expect(s.items.every((i) => i.status === 'need')).toBe(true);
    expect(s.trips).toEqual([]);
  });

  it('ignores corrupt saved data', () => {
    expect(loadState('{not json').items.length).toBe(DEFAULT_ITEMS.length);
    expect(loadState('{"items": "nope"}').items.length).toBe(DEFAULT_ITEMS.length);
  });

  it('restores saved items and trips', () => {
    const saved = JSON.stringify({
      items: [{ id: 'x', name: 'Kefir', aisle: 'Dairy', qty: '1', status: 'cart', checkedAt: NOW }],
      trips: [{ id: 't1', startedAt: NOW, items: 3 }],
    });
    const s = loadState(saved);
    expect(s.items[0].name).toBe('Kefir');
    expect(s.trips[0].items).toBe(3);
  });
});
