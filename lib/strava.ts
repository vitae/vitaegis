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

/** Pull the athlete's most recent activities (used once after connecting). */
export async function backfill(athleteId: number, perPage = 50) {
  const list = await api<ApiActivity[]>(athleteId, `/athlete/activities?per_page=${perPage}`);
  const db = supabaseAdmin();
  if (!db) throw new Error('Supabase is not configured');
  if (!list.length) return 0;
  const { error } = await db.from('strava_activities').upsert(list.map(toRow));
  if (error) throw new Error(error.message);
  return list.length;
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
