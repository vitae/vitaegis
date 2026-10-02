import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 60;

/** The VITAEGIS channel: youtube.com/@vitaegis */
export const CHANNEL_ID = 'UC86-DeLS51HEjnefcTupp7Q';

/**
 * Is the channel live right now? YouTube's /channel/<id>/live page lands on the stream's
 * watch page while a broadcast is on and on the channel page otherwise, so the answer is
 * in the HTML with no API key: the canonical watch URL plus an isLiveNow flag. Cached for
 * a minute on the CDN.
 */
export async function GET() {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${CHANNEL_ID}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (vitaegis.com live check)', 'Accept-Language': 'en' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const canonical =
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(html);
    const live = canonical !== null && /"isLiveNow":true/.test(html);
    return NextResponse.json(
      { live, videoId: live ? canonical![1] : null, channelId: CHANNEL_ID },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ live: false, videoId: null, channelId: CHANNEL_ID });
  }
}
