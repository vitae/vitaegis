import { NextResponse } from 'next/server';
import { getLiveQuotes } from '@/lib/stocks-live';

export const runtime = 'nodejs';

// The paper portfolio's tickers at Nasdaq's latest regular-session prices, polled by /stocks:
// { session: 'open' | 'closed', at, quotes: { [ticker]: { date: 'YYYY-MM-DD', price } } }.
// The CDN keeps an answer for a few seconds while the market is open, so every viewer shares
// one request to Nasdaq; an answer with no quotes is retried sooner than a set of closes.
export async function GET() {
  const live = await getLiveQuotes();
  const seconds = live.session === 'open' ? 5 : Object.keys(live.quotes).length ? 60 : 30;
  return NextResponse.json(live, {
    headers: { 'Cache-Control': `public, s-maxage=${seconds}` },
  });
}
