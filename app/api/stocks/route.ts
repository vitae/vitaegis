import { NextResponse } from 'next/server';
import { getStockPrices, STOCKS_REVALIDATE_SECONDS } from '@/lib/stocks';

export const runtime = 'nodejs';
export const revalidate = 3600;
// A cold fetch of ~50 tickers takes several seconds; leave room over the platform default.
export const maxDuration = 60;

// Same hourly fetch the /stocks page uses, exposed as JSON:
// { asOf, prices: { [ticker]: close }, starts: { [ticker]: { [period]: close } },
//   startDates: { [period]: 'YYYY-MM-DD' }, source: 'live' | 'snapshot' }.
export async function GET() {
  const data = await getStockPrices();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, s-maxage=${STOCKS_REVALIDATE_SECONDS}, stale-while-revalidate=${STOCKS_REVALIDATE_SECONDS}`,
    },
  });
}
