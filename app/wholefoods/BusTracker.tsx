'use client';

import { useEffect, useState } from 'react';
import {
  clock12,
  FEED_NOTE,
  fullTimetable,
  LEGS,
  nextScheduled,
  serviceDay,
  type Departure,
  type Leg,
  type ServiceDay,
  type StopArrivals,
} from '@/lib/thebus';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const DAYS: ServiceDay[] = ['weekday', 'saturday', 'sunday'];
const POLL_MS = 30_000;

function useLive(stop: string) {
  const [data, setData] = useState<StopArrivals | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/thebus?stop=${stop}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StopArrivals;
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'offline');
      }
    };
    void load();
    const t = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [stop]);
  return { data, error };
}

function LegCard({ leg, now }: { leg: Leg; now: Date }) {
  const cfg = LEGS[leg];
  const { data, error } = useLive(cfg.board.id);
  const live = (data?.arrivals ?? []).filter((a) => cfg.headsign.test(a.headsign)).slice(0, 3);
  const sched: Departure[] = nextScheduled(leg, now, 3);

  return (
    <div className="rounded-xl border border-white/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{cfg.label}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Route 14 ·{' '}
          {data?.updated ? `updated ${data.updated}` : error ? 'live feed offline' : 'loading'}
        </span>
      </div>
      <p className="mt-1 text-xs font-light text-white/55">
        Board at {cfg.board.name}. Get off at {cfg.alight.name}.
      </p>

      <ul className="mt-4 space-y-2">
        {live.length === 0 && (
          <li className="text-sm font-light text-white/50">
            {error
              ? 'No live data right now. Scheduled times below.'
              : 'No more Route 14 buses listed today.'}
          </li>
        )}
        {live.map((a, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                a.status === 'live'
                  ? 'bg-vitae-green shadow-[0_0_10px_#00ff00] animate-pulse'
                  : a.status === 'canceled'
                    ? 'bg-vitae-red'
                    : 'bg-white/30'
              }`}
            />
            <span className="w-20 font-semibold text-white">{a.time}</span>
            <span className="text-white/60">
              {a.status === 'live' && `Bus ${a.vehicle} · live GPS`}
              {a.status === 'scheduled' && (a.noGps ? 'scheduled · no GPS yet' : 'scheduled')}
              {a.status === 'canceled' && <span className="text-vitae-red">canceled</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Timetable · next up</p>
        <ul className="mt-2 space-y-1 text-sm">
          {sched.length === 0 && (
            <li className="font-light text-white/50">
              Done for today. First bus tomorrow is below.
            </li>
          )}
          {sched.map((d) => (
            <li key={d.board} className="flex flex-wrap gap-x-3 text-white/80">
              <span className="w-20 font-medium text-white">{clock12(d.board)}</span>
              <span className="text-white/50">→ {clock12(d.alight)}</span>
              <span className="text-vitae-green/80">
                {d.minutesAway <= 0 ? 'now' : `in ${d.minutesAway} min`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <a
        href={`http://hea.thebus.org/nextbus.asp?s=${cfg.board.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-vitae-green"
      >
        Open stop {cfg.board.id} on TheBus HEA ↗
      </a>
    </div>
  );
}

export default function BusTracker() {
  const [now, setNow] = useState(() => new Date());
  const [showAll, setShowAll] = useState(false);
  const [day, setDay] = useState<ServiceDay>(() => serviceDay(new Date()));

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className={`${glass} p-6 sm:p-8`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={label}>Route 14 · Elks Club ↔ Whole Foods Kahala</h2>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Honolulu time · refreshes every 30 s
        </span>
      </div>
      <p className="mt-2 text-sm font-light text-white/60">
        About 12 minutes each way. Out: Kalakaua Ave at the Elks Club to Pahoa Ave at Kilauea Ave,
        the mauka corner of Kahala Mall. Back: Kilauea Ave at Waialae Ave to Paki Ave at Poni Moi
        Rd, a four-minute walk to the Elks Club. Weekdays the 14 runs about hourly with a gap from
        3:30 to 7 PM, so check before you leave.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <LegCard leg="toKahala" now={now} />
        <LegCard leg="toWaikiki" now={now} />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
        >
          {showAll ? 'Hide full timetable' : 'Full timetable, every time'}
        </button>
        {showAll && (
          <div className="mt-4">
            <div className="flex gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    day === d
                      ? 'border-vitae-green bg-vitae-green/10 text-vitae-green'
                      : 'border-white/15 text-white/60 hover:border-white/40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {(['toKahala', 'toWaikiki'] as Leg[]).map((leg) => (
                <div key={leg}>
                  <p className="text-xs font-semibold text-white">{LEGS[leg].label}</p>
                  <p className="text-[11px] text-white/45">
                    leaves {LEGS[leg].board.name.split(' (')[0]} → arrives{' '}
                    {LEGS[leg].alight.name.split(' (')[0]}
                  </p>
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {fullTimetable(leg, day).map(([b, a]) => (
                      <li key={b} className="flex justify-between text-white/80">
                        <span className="font-medium text-white">{clock12(b)}</span>
                        <span className="text-white/45">{clock12(a)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-light text-white/40">
              {FEED_NOTE}. Holidays run the Sunday table.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
