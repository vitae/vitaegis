import type { Metadata } from 'next';
import Link from 'next/link';
import { getStockPrices } from '@/lib/stocks';
import StocksBoard from './StocksBoard';
import { stocks } from './data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Stocks | VITAEGIS',
  description: 'Twelve tickers over 1 day to 5 years, refreshed hourly.',
  openGraph: {
    title: 'Stocks | VITAEGIS',
    description: 'Twelve tickers over 1 day to 5 years, refreshed hourly.',
    type: 'website',
  },
};

const formatAsOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });

export default async function StocksPage() {
  const { asOf, prices, starts, startDates, source } = await getStockPrices();
  const rows = stocks.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    end: prices[s.ticker] ?? s.end,
    starts: starts[s.ticker] ?? { ytd: s.start },
  }));
  const asOfText = source === 'snapshot' ? 'Snapshot' : `Closes as of ${formatAsOf(asOf)}`;

  return (
    // Like /run: the site's global CSS pins <html> to the viewport in some browsers, so this
    // page scrolls inside its own full-viewport container.
    <main
      className="nav-clear fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-black text-left text-white"
      style={{
        fontFamily: "'Jost', sans-serif",
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <div className="relative mx-auto max-w-3xl px-4 pb-32 pt-10 sm:px-6">
        <Link
          href="/"
          className="text-sm text-vitae-gray outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-vitae-green focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          ← Vitaegis
        </Link>

        <header className="pb-8 pt-10">
          <p className="text-sm text-vitae-gray">Stocks</p>
          <h1 className="mt-2 text-4xl font-semibold text-vitae-green sm:text-5xl">Wealth Board</h1>
          <p className="mt-4 max-w-xl text-base font-light text-white/70">
            Twelve tickers, ranked by how far they have moved over the period you pick, from one day
            to five years. Prices are daily closes from Yahoo Finance, refreshed hourly.
          </p>
        </header>

        <StocksBoard rows={rows} startDates={startDates} asOf={asOfText} source={source} />

        <p className="mt-8 text-xs font-light leading-relaxed text-vitae-gray">
          Not investment advice. Closes are adjusted for splits but not dividends, in US dollars;
          Bitcoin is the daily close in UTC. When the live feed is unavailable the board shows the
          last saved snapshot.
        </p>
      </div>
    </main>
  );
}
