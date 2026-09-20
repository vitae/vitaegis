'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  decodePolyline,
  durationLabel,
  metersToFeet,
  metersToMiles,
  paceMinPerMile,
  type StravaActivity,
} from '@/lib/strava';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const POLL_MS = 60_000;

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="bg-black px-3 py-5 text-center">
      <dd className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{value}</dd>
      <dt className={`${label} mt-2`}>{unit}</dt>
    </div>
  );
}

/** Tiny SVG of the activity's summary polyline. */
function Trace({ polyline, color = '#00ff41' }: { polyline: string | null; color?: string }) {
  if (!polyline) return null;
  const pts = decodePolyline(polyline);
  if (pts.length < 2) return null;
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const w = (maxLon - minLon) * kx || 1e-6;
  const h = maxLat - minLat || 1e-6;
  const scale = 100 / Math.max(w, h);
  const ox = (100 - w * scale) / 2, oy = (100 - h * scale) / 2;
  const d = pts
    .map(([lat, lon], i) => `${i ? 'L' : 'M'}${(ox + (lon - minLon) * kx * scale).toFixed(1)} ${(oy + (maxLat - lat) * scale).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="-4 -4 108 108" className="h-full w-full" aria-hidden>
      <path d={d} fill="none" stroke="#000" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.6" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Honolulu' });
  if (days === 0) return `Today · ${time}`;
  if (days === 1) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Pacific/Honolulu' })} · ${time}`;
}

const sportLabel = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

export default function LiveStravaFeed({ initial }: { initial: StravaActivity[] }) {
  const router = useRouter();
  const [activities, setActivities] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/strava/activities', { cache: 'no-store' });
        if (!res.ok) return;
        const { activities: next } = (await res.json()) as { activities: StravaActivity[] };
        if (!alive || !next?.length) return;
        setUpdatedAt(new Date());
        setActivities((prev) => {
          // A new top activity means the training log below is stale too.
          if (next[0].id !== prev[0]?.id) router.refresh();
          return next;
        });
      } catch {
        /* keep the last good list */
      }
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router]);

  const [latest] = activities;
  if (!latest) return null;
  const miles = metersToMiles(latest.distance_m);
  const pace = paceMinPerMile(latest.distance_m, latest.moving_time_s);

  return (
    <section id="live" className={`${glass} mt-12 p-6 sm:p-10`}>
      <header className="text-center">
        <p className={label}>
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-vitae-green align-middle shadow-[0_0_8px_#00ff00]" />
          Live from Strava · {latest.device_name ?? 'Apple Watch Ultra'}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">{latest.name}</h2>
        <p className="mt-2 text-sm font-light text-white/60">
          {sportLabel(latest.sport_type)} · {when(latest.start_date)}
        </p>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_180px]">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-vitae-green/25 bg-vitae-green/25 sm:grid-cols-4">
          <Stat value={miles.toFixed(2)} unit="miles" />
          <Stat value={pace ?? '–'} unit="pace /mi" />
          <Stat value={durationLabel(latest.moving_time_s)} unit="moving" />
          <Stat value={latest.average_heartrate ? `${Math.round(latest.average_heartrate)}` : `+${Math.round(metersToFeet(latest.elevation_gain_m))}`} unit={latest.average_heartrate ? 'avg bpm' : 'ft climbed'} />
        </dl>
        <div className="mx-auto h-40 w-40 md:h-full md:w-full">
          <Trace polyline={latest.summary_polyline} />
        </div>
      </div>

      <p className="mt-6 text-center text-xs font-light text-white/40">
        Pushed by Strava webhooks the moment the watch uploads; this page re-checks every minute.
        {updatedAt ? ` Last check ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.` : ''}
      </p>
    </section>
  );
}
