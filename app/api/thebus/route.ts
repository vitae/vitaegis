import { NextResponse } from 'next/server';
import { ALLOWED_STOPS, HEA_STOP_URL, parseHeaStop, route14Only } from '@/lib/thebus';

export const dynamic = 'force-dynamic';

/** Live Route 14 arrivals for one of the two trip stops, proxied from TheBus HEA. */
export async function GET(req: Request) {
  const stop = new URL(req.url).searchParams.get('stop') ?? '';
  if (!ALLOWED_STOPS.has(stop)) {
    return NextResponse.json({ error: 'unknown stop' }, { status: 400 });
  }
  try {
    const res = await fetch(HEA_STOP_URL(stop), {
      headers: { 'user-agent': 'vitaegis.com/wholefoods (bus tracker)' },
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error(`HEA ${res.status}`);
    const data = route14Only(parseHeaStop(await res.text()));
    return NextResponse.json(data, {
      headers: { 'cache-control': 'public, s-maxage=20, stale-while-revalidate=60' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'HEA unavailable' },
      { status: 502 },
    );
  }
}
