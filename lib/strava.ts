// Strava API helpers: OAuth tokens, activity fetch/upsert, and display formatting.
// Docs: https://developers.strava.com/docs/reference/ and /docs/webhooks/
import { supabaseAdmin } from './supabase';

const STRAVA = 'https://www.strava.com';
const API = `${STRAVA}/api/v3`;

export const stravaConfigured = () =>
  Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

export function authorizeUrl(redirectUri: string) {
  const q = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  return `${STRAVA}/oauth/authorize?${q}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; [k: string]: unknown };
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      ...params,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Exchange the OAuth code and store the athlete's tokens. Returns the athlete id. */
export async function exchangeCode(code: string) {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  const athleteId = t.athlete?.id;
  if (!athleteId) throw new Error('Strava token response had no athlete');
  const db = supabaseAdmin();
  if (!db) throw new Error('Supabase is not configured');
  const { error } = await db.from('strava_tokens').upsert({
    athlete_id: athleteId,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    athlete: t.athlete,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return athleteId;
}

/** Valid access token for the athlete, refreshing when it expires within 5 minutes. */
export async function accessTokenFor(athleteId: number) {
  const db = supabaseAdmin();
  if (!db) throw new Error('Supabase is not configured');
  const { data, error } = await db.from('strava_tokens').select('*').eq('athlete_id', athleteId).single();
  if (error || !data) throw new Error(`No Strava token for athlete ${athleteId}`);
  if (data.expires_at - 300 > Math.floor(Date.now() / 1000)) return data.access_token as string;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: data.refresh_token });
  await db
    .from('strava_tokens')
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString() })
    .eq('athlete_id', athleteId);
  return t.access_token;
}

export async function removeAthlete(athleteId: number) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from('strava_activities').delete().eq('athlete_id', athleteId);
  await db.from('strava_tokens').delete().eq('athlete_id', athleteId);
}

export interface StravaActivity {
  id: number;
  athlete_id: number;
  name: string;
  sport_type: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  elevation_gain_m: number;
  start_date: string;
  start_date_local: string;
  timezone: string | null;
  average_speed: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  device_name: string | null;
  summary_polyline: string | null;
}

// Shape of the fields we read from Strava's DetailedActivity / SummaryActivity.
interface ApiActivity {
  id: number;
  athlete: { id: number };
  name: string;
  sport_type?: string;
  type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone?: string;
  average_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  device_name?: string;
  map?: { summary_polyline?: string };
}

function toRow(a: ApiActivity) {
  return {
    id: a.id,
    athlete_id: a.athlete.id,
    name: a.name,
    sport_type: a.sport_type ?? a.type ?? 'Workout',
    distance_m: a.distance ?? 0,
    moving_time_s: a.moving_time ?? 0,
    elapsed_time_s: a.elapsed_time ?? 0,
    elevation_gain_m: a.total_elevation_gain ?? 0,
    start_date: a.start_date,
    start_date_local: a.start_date_local,
    timezone: a.timezone ?? null,
    average_speed: a.average_speed ?? null,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    device_name: a.device_name ?? null,
    summary_polyline: a.map?.summary_polyline ?? null,
    raw: a,
    updated_at: new Date().toISOString(),
  };
}

async function api<T>(athleteId: number, path: string): Promise<T> {
  const token = await accessTokenFor(athleteId);
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Strava ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Fetch one activity from Strava and upsert it. */
export async function syncActivity(athleteId: number, activityId: number) {
  const a = await api<ApiActivity>(athleteId, `/activities/${activityId}`);
  const db = supabaseAdmin();
  if (!db) throw new Error('Supabase is not configured');
  const { error } = await db.from('strava_activities').upsert(toRow(a));
  if (error) throw new Error(error.message);
}

export async function deleteActivity(activityId: number) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from('strava_activities').delete().eq('id', activityId);
}

/** Pull the athlete's activity history, newest first, a page at a time. */
export async function backfill(athleteId: number, maxPages = 10, perPage = 200) {
  const db = supabaseAdmin();
  if (!db) throw new Error('Supabase is not configured');
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const list = await api<ApiActivity[]>(athleteId, `/athlete/activities?per_page=${perPage}&page=${page}`);
    if (!list.length) break;
    const { error } = await db.from('strava_activities').upsert(list.map(toRow));
    if (error) throw new Error(error.message);
    total += list.length;
    if (list.length < perPage) break;
  }
  return total;
}

/** Latest activities for the site (any athlete that has connected). */
export async function recentActivities(limit = 12): Promise<StravaActivity[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from('strava_activities')
    .select(
      'id, athlete_id, name, sport_type, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, start_date, start_date_local, timezone, average_speed, average_heartrate, max_heartrate, device_name, summary_polyline',
    )
    .order('start_date', { ascending: false })
    .limit(limit);
  return (data ?? []) as StravaActivity[];
}

// ── formatting ──────────────────────────────────────────────────────────────

export const metersToMiles = (m: number) => m / 1609.344;
export const metersToFeet = (m: number) => m * 3.28084;

export function paceMinPerMile(distanceM: number, movingS: number) {
  if (!distanceM || !movingS) return null;
  const min = movingS / 60 / metersToMiles(distanceM);
  const mm = Math.floor(min);
  const ss = Math.round((min - mm) * 60);
  return `${mm}:${String(ss === 60 ? 0 : ss).padStart(2, '0')}`;
}

export function durationLabel(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Google polyline decoder (precision 5, as Strava encodes). Returns [lat, lon][]. */
export function decodePolyline(str: string): [number, number][] {
  let index = 0, lat = 0, lon = 0;
  const out: [number, number][] = [];
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    out.push([lat / 1e5, lon / 1e5]);
  }
  return out;
}

// ── training log ────────────────────────────────────────────────────────────

export interface WeekBucket { start: string; label: string; miles: number; runs: number; current: boolean }
export interface ActivityStats {
  week: number; month: number; year: number;
  totalRuns: number; totalMiles: number;
  longest: { miles: number; name: string; date: string } | null;
  weeks: WeekBucket[];
  history: StravaActivity[];
}

/**
 * Strava sends start_date_local as local wall time carrying a Z suffix, so the UTC
 * getters on that value are the athlete's own clock. All bucketing uses them.
 */
const localParts = (iso: string) => {
  const d = new Date(iso);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), date: d };
};

/** Midnight on the Monday of that value's week, in the athlete's local clock. */
function weekStart(iso: string) {
  const { date } = localParts(iso);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  const s = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return s;
}

export async function activityStats(weeksBack = 12, historyLimit = 20): Promise<ActivityStats | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from('strava_activities')
    .select(
      'id, athlete_id, name, sport_type, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, start_date, start_date_local, timezone, average_speed, average_heartrate, max_heartrate, device_name, summary_polyline',
    )
    .order('start_date', { ascending: false })
    .limit(1000);
  const all = (data ?? []) as StravaActivity[];
  if (!all.length) return null;

  const now = new Date();
  const todayLocal = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const thisWeek = weekStart(todayLocal.toISOString());

  // Twelve consecutive week buckets ending with the current one, so gaps stay visible.
  const buckets = new Map<string, WeekBucket>();
  for (let i = weeksBack - 1; i >= 0; i--) {
    const s = new Date(thisWeek);
    s.setUTCDate(s.getUTCDate() - i * 7);
    const key = s.toISOString().slice(0, 10);
    buckets.set(key, {
      start: key,
      label: `${s.getUTCMonth() + 1}/${s.getUTCDate()}`,
      miles: 0,
      runs: 0,
      current: i === 0,
    });
  }

  let week = 0, month = 0, year = 0, totalMiles = 0;
  let longest: ActivityStats['longest'] = null;
  const nowParts = localParts(todayLocal.toISOString());

  for (const a of all) {
    const mi = metersToMiles(a.distance_m);
    const p = localParts(a.start_date_local);
    totalMiles += mi;
    if (p.y === nowParts.y) {
      year += mi;
      if (p.m === nowParts.m) month += mi;
    }
    const key = weekStart(a.start_date_local).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) {
      b.miles += mi;
      b.runs += 1;
      if (key === thisWeek.toISOString().slice(0, 10)) week += mi;
    }
    if (!longest || mi > longest.miles) longest = { miles: mi, name: a.name, date: a.start_date_local };
  }

  return {
    week, month, year,
    totalRuns: all.length,
    totalMiles,
    longest,
    weeks: [...buckets.values()],
    history: all.slice(0, historyLimit),
  };
}
