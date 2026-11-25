import type { Metadata } from 'next';
import Link from 'next/link';
import { getStockPrices } from '@/lib/stocks';
import { deskKey } from '@/lib/stocks-portfolio';
import PaperDesk from './PaperDesk';
import StocksBoard from './StocksBoard';
import { paper, papers, stocks } from './data';
import styles from './stocks.module.css';

export const revalidate = 3600;
// A cold fetch of ~80 tickers takes several seconds; leave room over the platform default.
export const maxDuration = 60;

const DESCRIPTION =
  'Paper portfolios of $10,000, $5,000 and $1,000 across twelve stocks, marked to Nasdaq prices while the market is open and to every daily close, with TradingView charts and the wider market.';

export const metadata: Metadata = {
  title: 'Stocks | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'Stocks | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });

/** The page's windows, listed in the status line the way a multiplexer lists them: one per portfolio, then the shared sections. */
const WINDOWS = [...papers.map((p) => deskKey(p.capital)), 'rank', 'chart', 'scan'];

/** "$10,000, $5,000 and $1,000" */
const SIZES = new Intl.ListFormat('en-US', { type: 'conjunction' }).format(
  papers.map((p) => `$${p.capital.toLocaleString('en-US')}`),
);

export default async function StocksPage() {
  const { asOf, prices, starts, startDates, history, source } = await getStockPrices();
  const rows = stocks.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    group: s.group,
    end: prices[s.ticker] ?? s.end,
    starts: starts[s.ticker] ?? { ytd: s.start },
  }));
  const asOfText = source === 'snapshot' ? 'Snapshot' : `Closes as of ${formatDate(asOf)}`;
  const names = Object.fromEntries(stocks.map((s) => [s.ticker, s.name]));
  const trail = Object.fromEntries(
    paper.positions.map((p) => [
      p.ticker,
      { end: prices[p.ticker], starts: starts[p.ticker] ?? {} },
    ]),
  );
  const entryDate = formatDate(`${paper.opened}T12:00:00Z`);

  return (
    // Like /run: the site's global CSS pins <html> to the viewport in some browsers, so this
    // page scrolls inside its own full-viewport container.
    <main
      className="nav-clear fixed inset-0 z-10 w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-black text-left text-white"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className={`${styles.term} relative mx-auto max-w-5xl px-2 pb-32 pt-4 sm:px-6 sm:pt-8`}>
        <div className={styles.frame}>
          <nav className={styles.status} aria-label="Sections of this page">
            <Link href="/">[vitaegis]</Link>
            {WINDOWS.map((w, i) => (
              <a key={w} href={`#${w}`}>
                {i}:{w}
              </a>
            ))}
            <span className={styles.statusInfo}>
              paper, no real orders | {asOfText.toLowerCase()}
            </span>
          </nav>

          <div className="px-3 sm:px-7">
            <header className="pb-8 pt-9">
              <h1 className={`${styles.brand} text-4xl font-semibold text-vitae-green sm:text-5xl`}>
                Stocks
              </h1>
              <p className="mt-4 max-w-[68ch] font-normal text-white/70">
                Paper portfolios of {SIZES}, each across the same {paper.positions.length} stocks at
                the same weights, bought at the {entryDate} close. While the market is open they are
                marked to Nasdaq&apos;s last sale price; after it, to the close. No real orders are
                placed. Under them, the positions ranked by how fast they gained, a chart of each
                one and the wider market.
              </p>
            </header>

            <PaperDesk
              portfolios={papers}
              history={history}
              names={names}
              trail={trail}
              asOf={asOfText}
            />

            <StocksBoard rows={rows} startDates={startDates} asOf={asOfText} source={source} />

            <footer className={`${styles.section} text-xs leading-relaxed text-vitae-gray`}>
              <p className="max-w-[76ch]">
                Not investment advice. The portfolios are paper ones: in each, every position was
                filled at its {entryDate} closing price at the weight listed under positions. During
                the regular session, prices are Nasdaq&apos;s last sale, read about every ten
                seconds while this page is in view; pre-market and after-hours trades are not
                counted, and a day&apos;s row in the log is final once its close is published.
              </p>
              <p className="mt-3 max-w-[76ch]">
                Closes are adjusted for splits but not dividends, in US dollars; Bitcoin trades
                around the clock, so its daily close is the data source&apos;s cutoff. ANT and SPCX
                listed in 2026, so their year to date runs from the IPO price. If Nasdaq is
                unavailable for a ticker the board uses Yahoo Finance, and if both are down, the
                last saved snapshot.
              </p>
              <p className="mt-6 text-sm text-white" aria-hidden>
                <span className="text-vitae-green">vitae@wealth:~$</span>
                <span className={styles.cursor} />
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
