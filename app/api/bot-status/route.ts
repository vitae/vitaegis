import { NextResponse } from 'next/server';
import {
  normalizeWire,
  type BotStatus,
  type BotStatusWire,
  type MarketInfo,
} from '@/lib/kalshi-hud';

export const dynamic = 'force-dynamic';

const KALSHI_HOST = process.env.KALSHI_PUBLIC_HOST ?? 'https://api.elections.kalshi.com';
const SERIES = process.env.KALSHI_SERIES ?? 'KXBTC15M';
const PROBE_TIMEOUT_MS = 2500;

interface KalshiMarketRow {
  ticker: string;
  title?: string;
  subtitle?: string;
  yes_sub_title?: string;
  open_time?: string;
  close_time?: string;
  floor_strike?: number;
  cap_strike?: number;
  strike_type?: string;
  yes_ask_dollars?: string;
  yes_bid_dollars?: string;
  no_ask_dollars?: string;
  volume_fp?: string;
  open_interest_fp?: string;
  status?: string;
}

const cents = (d: string | undefined) =>
  d == null || d === '' ? null : Math.round(Number(d) * 100);
const num = (d: string | undefined) => (d == null || d === '' ? null : Number(d));

function marketInfo(m: KalshiMarketRow): MarketInfo {
  return {
    ticker: m.ticker,
    title: m.title ?? m.ticker,
    subtitle: m.yes_sub_title ?? m.subtitle ?? null,
    openTime: m.open_time ?? null,
    closeTime: m.close_time ?? null,
    strike: m.floor_strike ?? m.cap_strike ?? null,
    strikeType: m.strike_type ?? null,
    yesAsk: cents(m.yes_ask_dollars),
    yesBid: cents(m.yes_bid_dollars),
    noAsk: cents(m.no_ask_dollars),
    volume: num(m.volume_fp),
    openInterest: num(m.open_interest_fp),
  };
}

/** The bot's market from Kalshi's public API (strike, asks, volume), or the soonest-closing
 *  open one when the bot names none. Rate-limited by IP, so cached for ten seconds. */
async function fetchMarket(ticker: string | null): Promise<MarketInfo | null> {
  try {
    if (ticker) {
      const res = await fetch(`${KALSHI_HOST}/trade-api/v2/markets/${encodeURIComponent(ticker)}`, {
        next: { revalidate: 10 },
      });
      if (res.ok) {
        const body = (await res.json()) as { market?: KalshiMarketRow };
        if (body.market && body.market.status !== 'finalized') return marketInfo(body.market);
      }
    }
    const res = await fetch(
      `${KALSHI_HOST}/trade-api/v2/markets?series_ticker=${SERIES}&status=open&limit=20`,
      { next: { revalidate: 10 } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { markets?: KalshiMarketRow[] };
    const now = Date.now();
    const soonest = (body.markets ?? [])
      .filter((m) => m.close_time && Date.parse(m.close_time) > now)
      .sort((a, b) => Date.parse(a.close_time as string) - Date.parse(b.close_time as string))[0];
    return soonest ? marketInfo(soonest) : null;
  } catch {
    return null;
  }
}

/** GET $KALSHI_BOT_URL/status on the Lightsail VPS, with a short timeout and an optional
 *  bearer token (KALSHI_BOT_TOKEN). */
async function probeBot(): Promise<{ vps: BotStatus['vps']; wire: BotStatusWire | null }> {
  const base = process.env.KALSHI_BOT_URL?.replace(/\/$/, '');
  const off = { ok: null, latencyMs: null, version: null, uptimeS: null, detail: null };
  if (!base) return { vps: { configured: false, ...off }, wire: null };
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const token = process.env.KALSHI_BOT_TOKEN;
    const res = await fetch(`${base}/status`, {
      cache: 'no-store',
      signal: ctl.signal,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        vps: {
          configured: true,
          ok: false,
          latencyMs,
          version: null,
          uptimeS: null,
          detail: `HTTP ${res.status}`,
        },
        wire: null,
      };
    }
    const wire = (await res.json()) as BotStatusWire;
    return {
      vps: {
        configured: true,
        ok: wire.ok ?? true,
        latencyMs,
        version: wire.version ?? null,
        uptimeS: wire.uptime_s ?? null,
        detail: null,
      },
      wire,
    };
  } catch (e) {
    return {
      vps: {
        configured: true,
        ok: false,
        latencyMs: Date.now() - started,
        version: null,
        uptimeS: null,
        detail:
          e instanceof Error && e.name === 'AbortError'
            ? 'timeout'
            : e instanceof Error
              ? e.message
              : 'unreachable',
      },
      wire: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** System health for the HUD: the Rust bot's own status (process, Kalshi WebSocket, spot,
 *  window, log tail) proxied from the VPS, plus the window's strike and book from Kalshi's
 *  public API. The bankroll is passed through only when KALSHI_HUD_BALANCE=public, since
 *  /kalshi is a public page. */
export async function GET() {
  const { vps, wire } = await probeBot();
  const fromBot = normalizeWire(wire ?? {});
  const market = await fetchMarket(fromBot.ticker);
  const body: BotStatus = {
    vps,
    ...fromBot,
    market,
    ...(process.env.KALSHI_HUD_BALANCE === 'public' && wire
      ? { bankrollCents: wire.bankroll_cents ?? null }
      : {}),
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
