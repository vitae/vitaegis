import {
  activityStats,
  durationLabel,
  metersToFeet,
  metersToMiles,
  paceMinPerMile,
} from '@/lib/strava';
import WeeklyMiles from './WeeklyMiles';

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

function Tile({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="bg-black px-3 py-5 text-center">
      <dd className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{value}</dd>
      <dt className={`${label} mt-2`}>{unit}</dt>
    </div>
  );
}

const dayLabel = (iso: string) => {
  // start_date_local carries local wall time with a Z suffix, so read it in UTC.
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
};
const weekdayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const yearOf = (iso: string) => new Date(iso).getUTCFullYear();
const sportLabel = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

/** Training log: totals, twelve weeks of mileage, and the dated history. */
export default async function RunLog() {
  const stats = await activityStats();
  if (!stats) return null;
  const thisYear = new Date().getUTCFullYear();

  return (
    <section id="log" className={`${glass} mt-6 p-6 sm:p-10`}>
      <header className="text-center">
        <p className={label}>Training log</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-wide text-white sm:text-4xl">
          Progress
        </h2>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-vitae-green/25 bg-vitae-green/25 sm:grid-cols-4">
        <Tile value={stats.week.toFixed(1)} unit="miles this week" />
        <Tile value={stats.month.toFixed(1)} unit="miles this month" />
        <Tile value={Math.round(stats.year).toString()} unit={`miles in ${thisYear}`} />
        <Tile value={stats.totalRuns.toString()} unit="activities logged" />
      </dl>

      <div className="mt-10">
        <h3 className={`${label} text-center`}>Miles per week · last {stats.weeks.length} weeks</h3>
        <div className="mt-4">
          <WeeklyMiles weeks={stats.weeks} />
        </div>
      </div>

      {stats.longest && (
        <p className="mt-6 text-center text-sm font-light text-white/60">
          Longest so far: {stats.longest.miles.toFixed(1)} miles, {stats.longest.name},{' '}
          {dayLabel(stats.longest.date)} {yearOf(stats.longest.date)}.
        </p>
      )}

      <div className="mt-10 overflow-x-auto">
        <h3 className={`${label} text-center`}>Every activity</h3>
        <table className="mt-4 w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-vitae-green/25 text-[11px] uppercase tracking-[0.18em] text-white/50">
              <th scope="col" className="py-2 pr-3 font-medium">
                Date
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Activity
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Miles
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Pace
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Time
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Climb
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vitae-green/10">
            {stats.history.map((a) => (
              <tr key={a.id} className="text-white/80">
                <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums">
                  <span className="text-white">{dayLabel(a.start_date_local)}</span>
                  <span className="ml-2 text-xs text-white/45">
                    {weekdayLabel(a.start_date_local)}
                  </span>
                </td>
                <td className="max-w-[220px] truncate py-2.5 pr-3">
                  <span className="text-white">{a.name}</span>
                  <span className="ml-2 text-xs text-white/45">{sportLabel(a.sport_type)}</span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {metersToMiles(a.distance_m).toFixed(2)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {paceMinPerMile(a.distance_m, a.moving_time_s) ?? '–'}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {durationLabel(a.moving_time_s)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {Math.round(metersToFeet(a.elevation_gain_m))} ft
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center text-xs font-light text-white/40">
        Every activity your watch uploads to Strava, oldest kept, newest first. Dates and weeks are
        Honolulu local time.
      </p>
    </section>
  );
}
