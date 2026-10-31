'use client';

// The two live feeds behind /kalshi. Kalshi quotes come from the bot over Supabase
// Realtime (topic `kalshi`); BTC/USD comes straight from Coinbase's public feed.

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { TickPayload } from '@/lib/kalshi';

interface Handlers {
  onTick: (tick: TickPayload) => void;
  onEvent: (event: 'order' | 'settle') => void;
}

/** Subscribes to the bot's broadcasts. Returns whether the channel is joined. */
export function useKalshiFeed(handlers: Handlers): boolean {
  const [joined, setJoined] = useState(false);
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const channel = sb
      .channel('kalshi')
      .on('broadcast', { event: 'tick' }, ({ payload }) => h.current.onTick(payload as TickPayload))
      .on('broadcast', { event: 'order' }, () => h.current.onEvent('order'))
      .on('broadcast', { event: 'settle' }, () => h.current.onEvent('settle'))
      .subscribe((status) => setJoined(status === 'SUBSCRIBED'));
    return () => {
      void sb.removeChannel(channel);
    };
  }, []);

  return joined;
}

export interface BtcFeed {
  price: number | null;
  /** Direction of the last move, for the flash. */
  dir: 'up' | 'down' | null;
  history: { t: number; p: number }[];
  connected: boolean;
}

/** Coinbase Exchange ticker for one product, throttled to one render per frame. */
export function useCoinbaseTicker(product = 'BTC-USD', keep = 240): BtcFeed {
  const [feed, setFeed] = useState<BtcFeed>({
    price: null,
    dir: null,
    history: [],
    connected: false,
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 1000;
    let timer: number | undefined;
    let frame: number | undefined;
    let latest: { t: number; p: number } | null = null;

    const flush = () => {
      frame = undefined;
      const next = latest;
      latest = null;
      if (!next) return;
      setFeed((s) => ({
        price: next.p,
        dir: s.price == null || next.p === s.price ? s.dir : next.p > s.price ? 'up' : 'down',
        history: [...s.history.slice(-(keep - 1)), next],
        connected: true,
      }));
    };

    const connect = () => {
      ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      ws.onopen = () => {
        retry = 1000;
        ws?.send(
          JSON.stringify({ type: 'subscribe', product_ids: [product], channels: ['ticker'] }),
        );
        setFeed((s) => ({ ...s, connected: true }));
      };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string) as { type?: string; price?: string; time?: string };
        if (m.type !== 'ticker' || !m.price) return;
        latest = { t: m.time ? Date.parse(m.time) : Date.now(), p: Number(m.price) };
        if (frame === undefined) frame = window.requestAnimationFrame(flush);
      };
      ws.onclose = () => {
        setFeed((s) => ({ ...s, connected: false }));
        if (closed) return;
        timer = window.setTimeout(connect, retry);
        retry = Math.min(retry * 2, 15_000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => {
      closed = true;
      window.clearTimeout(timer);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      ws?.close();
    };
  }, [product, keep]);

  return feed;
}
