import type { Metadata } from 'next';
import Link from 'next/link';
import { getBtcDashboard } from '@/lib/crypto/btc';
import { getGainers, WINDOWS } from '@/lib/crypto/gainers';
import type { Lean } from '@/lib/crypto/signals';
import BtcLive from './BtcLive';
import BtcChart from './BtcChart';
import GainersBoard from './GainersBoard';
import styles from './crypto.module.css';

// Five-minute refresh for the page; the ticker re-reads Chainlink every minute on its own.
export const revalidate = 300;
// The very first render backfills a year and a half of daily closes from Chainlink into
// Supabase (about 20 seconds); after that a refresh only reads what is new.
export const maxDuration = 300;

const DESCRIPTION =
  'Bitcoin from the Chainlink BTC/USD feed: live price, daily to yearly returns, a bull or bear trend read, and the biggest crypto gainers.';

export const metadata: Metadata = {
  title: 'Crypto | VITAEGIS',
  description: DESCRIPTION,
  openGraph: { title: 'Crypto | VITAEGIS', description: DESCRIPTION, type: 'website' },
};

const leanText: Record<Lean, string> = {
  bull: 'text-vitae-green',
  bear: 'text-vitae-red',
  neutral: 'text-vitae-gray',
};
const leanDot: Record<Lean, string> = {
  bull: 'bg-vitae-green',
  bear: 'bg-vitae-red',
  neutral: 'bg-vitae-gray',
};

const signed = (n: number | null, digits = 1) =>
  n === null ? '—' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(digits)}%`;
const tone = (n: number | null) =>
  n === null ? 'text-vitae-gray' : n >= 0 ? 'text-vitae-green' : 'text-vitae-red';
const monthName = (ym: string) =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });

export default async function CryptoPage() {
  const [btc, gainers] = await Promise.all([getBtcDashboard(), getGainers()]);
  const r = btc.regime;

  return (
    // Same shell as /stocks: the page scrolls inside its own full-viewport container.
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
          <p className="text-sm text-vitae-gray">Crypto</p>
          <h1 className="mt-2 text-4xl font-semibold text-vitae-green sm:text-5xl">
            Bitcoin Board
          </h1>
          <p className="mt-4 max-w-xl text-base font-light text-white/70">
            Bitcoin straight from the Chainlink oracle on Ethereum, its run over the day, week,
            month and year, a read on whether the trend is bull or bear, and the coins moving
            hardest right now.
          </p>
        </header>

        {btc.source === 'live' && btc.price !== null && btc.updatedAt !== null ? (
          <>
            <BtcLive
              price={btc.price}
              updatedAt={btc.updatedAt}
              returns={btc.returns.map(({ key, label, from }) => ({ key, label, from }))}
            />
            <BtcChart
              intraday={btc.intraday}
              daily={btc.daily}
              livePrice={btc.price}
              asOf={btc.updatedAt * 1000}
            />
          </>
        ) : (
          <p className="rounded-xl border border-white/15 px-4 py-10 text-center text-sm text-vitae-gray">
            The Chainlink feed could not be reached just now. This page retries every five minutes.
          </p>
        )}

        {r && (
          <section aria-labelledby="trend-heading" className={`mt-14 ${styles.numeric}`}>
            <h2 id="trend-heading" className="text-xl font-medium text-white">
              Trend read
            </h2>
            <div className="mt-4 rounded-xl border border-white/15 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className={`text-3xl font-semibold ${leanText[r.lean]}`}>{r.label}</p>
                <p className="text-sm text-vitae-gray">
                  Score{' '}
                  <span className={leanText[r.lean]}>{r.score > 0 ? `+${r.score}` : r.score}</span>{' '}
                  of ±{r.max}
                </p>
              </div>
              {/* One cell per signal, filled from the centre toward the side the score leans. */}
              <div
                className="mt-3 grid gap-1"
                style={{ gridTemplateColumns: `repeat(${r.max * 2}, minmax(0, 1fr))` }}
                aria-hidden
              >
                {Array.from({ length: r.max * 2 }, (_, i) => {
                  const pos = i - r.max; // −max … max−1
                  const on = r.score < 0 ? pos >= r.score && pos < 0 : pos >= 0 && pos < r.score;
                  return (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full ${on ? (r.score < 0 ? 'bg-vitae-red' : 'bg-vitae-green') : 'bg-white/10'}`}
                    />
                  );
                })}
              </div>
              <p className="mt-4 text-base font-light text-white/80">{r.outlook}</p>

              <ul className="mt-5 divide-y divide-white/10 border-t border-white/10">
                {r.signals.map((s) => (
                  <li key={s.name} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${leanDot[s.lean]}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap justify-between gap-x-3 text-sm">
                        <span className="text-white">{s.name}</span>
                        <span className={leanText[s.lean]}>
                          <span className="sr-only">{s.lean}: </span>
                          {s.value}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-vitae-gray">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-2 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                {r.mayer !== null && (
                  <p>
                    <span className="text-vitae-gray">Mayer Multiple </span>
                    <span className="text-white">{r.mayer.toFixed(2)}</span>
                    <span className="block text-xs text-vitae-gray">
                      Price over its 200-day average. Above 2.4 has marked past tops; below 0.8,
                      past bottoms.
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-vitae-gray">Halving cycle </span>
                  <span className="text-vitae-orange">month {r.cycle.monthsSinceHalving}</span>
                  <span className="block text-xs text-vitae-gray">{r.cycle.note}</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {btc.months.length > 0 && (
          <section aria-labelledby="months-heading" className={`mt-14 ${styles.numeric}`}>
            <h2 id="months-heading" className="text-xl font-medium text-white">
              Month by month
            </h2>
            <ol className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 sm:grid-cols-4">
              {btc.months.map((m, i) => (
                <li key={m.month} className="bg-black px-3 py-3">
                  <p className="text-xs text-vitae-gray">
                    {monthName(m.month)}
                    {i === btc.months.length - 1 ? ' · to date' : ''}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${tone(m.pct)}`}>{signed(m.pct)}</p>
                  <p className="text-xs text-white/50">
                    ${Math.round(m.close).toLocaleString('en-US')}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {btc.years.length > 0 && (
          <section aria-labelledby="years-heading" className={`mt-10 ${styles.numeric}`}>
            <h2 id="years-heading" className="text-xl font-medium text-white">
              Year by year
            </h2>
            <ol className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 sm:grid-cols-5">
              {btc.years.map((y, i) => (
                <li key={y.year} className="bg-black px-3 py-3">
                  <p className="text-xs text-vitae-gray">
                    {y.year}
                    {i === btc.years.length - 1 ? ' · to date' : ''}
                  </p>
                  <p className={`mt-1 text-base font-medium ${tone(y.pct)}`}>{signed(y.pct, 0)}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <GainersBoard
          windows={WINDOWS}
          lists={gainers.lists}
          available={gainers.source === 'live'}
        />

        <p className="mt-10 text-xs font-light leading-relaxed text-vitae-gray">
          Not investment advice. The trend read describes where the price sits against its own
          averages and momentum; it is not a forecast, and every one of these signals has been wrong
          before. Bitcoin prices come from the Chainlink BTC/USD price feed on Ethereum mainnet,
          which writes a new answer on every 0.5% move or at least hourly; daily closes are the
          feed&apos;s price at 00:00 UTC. Gainers come from CoinGecko, refreshed every 15 minutes,
          because Chainlink publishes feeds for only a few dozen assets.
        </p>
      </div>
    </main>
  );
}
