/* ═══════════════════════════════════════════════════════════════════════════════
   TheBus · Route 14 between the Elks Club and Whole Foods Kahala
   Live arrivals come from the public HEA stop page (hea.thebus.org/nextbus.asp),
   which needs no API key. The timetable comes from TheBus GTFS (lib/route14-schedule.json).
   ═══════════════════════════════════════════════════════════════════════════════ */

import schedule from './route14-schedule.json';

export type ArrivalStatus = 'live' | 'scheduled' | 'canceled';

export type Arrival = {
  route: string;
  headsign: string;
  direction: string;
  /** Clock time as shown by HEA, e.g. "11:23 AM". */
  time: string;
  status: ArrivalStatus;
  vehicle?: string;
  noGps?: boolean;
};

export type StopArrivals = {
  stop: string;
  name: string;
  updated: string;
  arrivals: Arrival[];
};

export const HEA_STOP_URL = (stop: string) => `http://hea.thebus.org/nextbus.asp?s=${stop}`;

/** The two legs of the trip. */
export const LEGS = {
  toKahala: {
    label: 'Elks Club → Whole Foods',
    board: schedule.toKahala.board,
    alight: schedule.toKahala.alight,
    headsign: /MAUNALANI/i,
  },
  toWaikiki: {
    label: 'Whole Foods → Elks Club',
    board: schedule.toWaikiki.board,
    alight: schedule.toWaikiki.alight,
    headsign: /ST LOUIS/i,
  },
} as const;

export type Leg = keyof typeof LEGS;
export type ServiceDay = 'weekday' | 'saturday' | 'sunday';

/** Stops the live-arrivals proxy will fetch; anything else is refused. */
export const ALLOWED_STOPS = new Set([LEGS.toKahala.board.id, LEGS.toWaikiki.board.id]);

const decode = (s: string) =>
  s
    .replace(/&middot;|&#183;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Parses the HEA "nextbus" stop page. Tolerates the per-vehicle variant (no <a> wrapper). */
export function parseHeaStop(html: string): StopArrivals {
  const head = html.match(/<h2[^>]*>([^<]*?)\s*\(Stop:\s*(\d+)\)<\/h2>/i);
  const updated = (html.match(/id="t">([^<]*)</) || [])[1]?.trim() ?? '';
  const arrivals: Arrival[] = [];
  const re =
    /<li[^>]*>(?:<a [^>]*>)?<b>(\d+)<i> <\/i>([^<]+)<\/b><br><i>([^<]+)<br>(.*?)<\/i>(?:<\/a>)?<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, route, headsign, direction, tail] = m;
    const text = decode(tail);
    const time = (text.match(/\d{1,2}:\d{2} [AP]M/) || [])[0] ?? '';
    const bus = text.match(/Bus (\d+)/);
    const status: ArrivalStatus = /canceled/i.test(text) ? 'canceled' : bus ? 'live' : 'scheduled';
    arrivals.push({
      route,
      headsign: headsign.trim(),
      direction: direction.trim(),
      time,
      status,
      ...(bus ? { vehicle: bus[1] } : {}),
      ...(/no GPS/i.test(text) ? { noGps: true } : {}),
    });
  }
  return { stop: head?.[2] ?? '', name: head?.[1]?.trim() ?? '', updated, arrivals };
}

export function route14Only(stop: StopArrivals): StopArrivals {
  return { ...stop, arrivals: stop.arrivals.filter((a) => a.route === '14') };
}

/** Which timetable applies on a given Honolulu date. Holidays run the Sunday table. */
export function serviceDay(now: Date, timeZone = 'Pacific/Honolulu'): ServiceDay {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(now);
  if (day === 'Sat') return 'saturday';
  if (day === 'Sun') return 'sunday';
  return 'weekday';
}

/** "HH:MM" in Honolulu for the given instant. */
export function honoluluClock(now: Date, timeZone = 'Pacific/Honolulu'): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(now);
}

export type Departure = { board: string; alight: string; minutesAway: number };

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Upcoming scheduled departures for a leg, soonest first. */
export function nextScheduled(
  leg: Leg,
  now: Date,
  limit = 4,
  timeZone = 'Pacific/Honolulu',
): Departure[] {
  const rows = schedule[leg][serviceDay(now, timeZone)] as [string, string][];
  const nowMin = mins(honoluluClock(now, timeZone));
  return rows
    .map(([board, alight]) => ({ board, alight, minutesAway: mins(board) - nowMin }))
    .filter((d) => d.minutesAway >= -1)
    .slice(0, limit);
}

export function fullTimetable(leg: Leg, day: ServiceDay): [string, string][] {
  return schedule[leg][day] as [string, string][];
}

/** "08:24" → "8:24 AM" */
export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

export const FEED_NOTE = schedule.feed;
