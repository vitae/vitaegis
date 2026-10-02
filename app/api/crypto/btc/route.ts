import { NextResponse } from 'next/server';
import { latestBtc } from '@/lib/crypto/chainlink';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The live Bitcoin price for the /crypto ticker: one latestRoundData() read of the
// Chainlink BTC/USD feed. The CDN holds each answer 30 seconds, so a page full of
// viewers polling costs one RPC call per half minute.
export async function GET() {
  try {
    const { answer, updatedAt, round, phase } = await latestBtc();
    return NextResponse.json(
      { price: answer, updatedAt, round, phase, source: 'chainlink' },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
