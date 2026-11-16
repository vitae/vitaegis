'use client';

import { useEffect, useState } from 'react';
import GlassContainer from '@/components/GlassContainer';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Live stream
   Shows the YouTube broadcast while the channel is live, checked once a minute.
   Off air it renders nothing.
   ═══════════════════════════════════════════════════════════════════════════════ */

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
      <section id="live" className="w-full max-w-4xl py-6 sm:py-10">
        <GlassContainer variant="default" glow lit padding="sm" className="mx-auto w-full">
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
      </section>
    );
  }

  return null;
}
