'use client';

import { useEffect, useState } from 'react';
import GlassContainer from '@/components/GlassContainer';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Live stream
   Shows the YouTube broadcast while the channel is live, checked once a minute.
   Off air it shows a quiet card with a link to the channel.
   ═══════════════════════════════════════════════════════════════════════════════ */

const CHANNEL_URL = 'https://www.youtube.com/@vitaegis';
const POLL_MS = 60_000;

interface Status {
  live: boolean;
  videoId: string | null;
}

export default function LiveStream() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as Status;
        if (alive) setStatus(json);
      } catch {
        /* keep the last answer */
      }
    };
    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (status?.live && status.videoId) {
    return (
      <GlassContainer variant="default" glow padding="sm" className="mx-auto w-full">
        <p className="mb-2 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-vitae-red">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-vitae-red"
            aria-hidden
          />
          Live now
        </p>
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${status.videoId}?autoplay=1&mute=1&rel=0`}
            title="VITAEGIS live stream"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </GlassContainer>
    );
  }

  return (
    <GlassContainer variant="default" glow padding="lg" className="mx-auto w-full">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-vitae-gray">
        {status === null ? 'Checking the channel' : 'Off air'}
      </p>
      <p className="mt-3 text-base font-light text-white/70 sm:text-lg">
        The stream appears here the moment we go live. Until then, the channel has every past
        session.
      </p>
      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-vitae-green/40 bg-vitae-green/10 px-5 py-3 text-sm font-medium text-vitae-green transition hover:bg-vitae-green hover:text-black"
      >
        Watch on YouTube
      </a>
    </GlassContainer>
  );
}
