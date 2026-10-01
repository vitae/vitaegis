import type { Metadata } from 'next';
import Link from 'next/link';
import Checklist from './Checklist';

export const metadata: Metadata = {
  title: 'Whole Foods Run | VITAEGIS VITALITY',
  description:
    'The Vitaegis grocery checklist for Whole Foods: what to buy, what is in the cart, what is stocked, with the date and time of every pickup and a link into the Whole Foods storefront on Amazon.',
  openGraph: {
    title: 'Whole Foods Run | VITAEGIS VITALITY',
    description:
      'Grocery checklist and inventory, timestamped, linked to the Whole Foods storefront on Amazon.',
    type: 'article',
  },
};

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

export default function WholeFoodsPage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-14 text-center">
          <p className={label}>Vitaegis Vitality · Fuel</p>
          <h1
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-6xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Whole Foods
            <br />
            Run
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Checklist and inventory in one. Tap an item into the cart, finish the trip, and every
            pickup is stamped with its date and time. Each item opens in the Whole Foods storefront
            on Amazon, signed in as you.
          </p>
        </header>

        <Checklist />

        <p className="mt-16 text-center text-xs font-light text-white/40">
          Saved in this browser only. Checkout and payment happen in your Amazon account, never
          here. Pair it with the{' '}
          <Link href="/vitamins" className="text-vitae-green/80 hover:text-vitae-green">
            daily stack
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
