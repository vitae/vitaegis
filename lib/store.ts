/* ═══════════════════════════════════════════════════════════════════════════════
   Store catalog
   One price for everything. The checkout route reads prices from here, never from
   the browser, so a tampered request cannot change what Stripe charges.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  priceCents: number;
  featured?: boolean;
}

export const STORE_PRICE_CENTS = 999;
export const STORE_PRICE_LABEL = '$9.99';

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'matcha',
    name: 'Matcha Green Tea from Yame, Japan',
    description: 'Premium ceremonial matcha direct from Yame, Fukuoka.',
    image: '/images/matcha.jpg',
    priceCents: STORE_PRICE_CENTS,
    featured: true,
  },
  {
    id: 'art-of-zen',
    name: 'The Art of Zen',
    description: 'A beautifully illustrated eBook on Zen philosophy.',
    image: '/images/zenbook.jpg',
    priceCents: STORE_PRICE_CENTS,
  },
  {
    id: 'yoga-for-life',
    name: 'Yoga for Life',
    description: 'A digital yoga guide with lifetime updates.',
    image: '/images/yogabook.jpg',
    priceCents: STORE_PRICE_CENTS,
  },
  {
    id: 'tai-chi-flow',
    name: 'Tai Chi Flow',
    description: 'A full video course on Tai Chi.',
    image: '/images/taichicourse.jpg',
    priceCents: STORE_PRICE_CENTS,
  },
];

export function getStoreProduct(id: unknown): StoreProduct | null {
  if (typeof id !== 'string') return null;
  return STORE_PRODUCTS.find((p) => p.id === id) ?? null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
