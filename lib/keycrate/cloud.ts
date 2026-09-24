/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · Supabase sync (browser)
   The browser talks to Supabase with the anon key as the signed-in user, so row-level
   security does the scoping. Uploads go in chunks of 500 rows.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Camelot, Playlist, PlaylistSettings, SetStudy, Track } from './types';

export const CHUNK = 500;

let client: SupabaseClient | null | undefined;

/** Null when the public Supabase env isn't configured; the app then stays local-only. */
export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}

export async function currentSession(): Promise<Session | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signOut(): Promise<void> {
  await supabaseBrowser()?.auth.signOut();
}

/* ── Rows ──────────────────────────────────────────────────────────────────── */

interface TrackRow {
  id?: string;
  user_id: string;
  source_id: string;
  artist: string;
  title: string;
  camelot: string | null;
  bpm: number | null;
  duration_s: number | null;
  genre: string | null;
  label: string | null;
  energy: number | null;
  rating: number | null;
  tags: string[];
  location: string | null;
  added_at: string | null;
}

function toRow(t: Track, userId: string): TrackRow {
  return {
    user_id: userId,
    source_id: t.sourceId,
    artist: t.artist,
    title: t.title,
    camelot: t.camelot,
    bpm: t.bpm,
    duration_s: t.durationS,
    genre: t.genre ?? null,
    label: t.label ?? null,
    energy: t.energy,
    rating: t.rating,
    tags: t.tags,
    location: t.location ?? null,
    added_at: t.addedAt ? new Date(t.addedAt).toISOString() : null,
  };
}

function fromRow(r: TrackRow & { id: string }): Track {
  const numeric = /^\d+$/.test(r.source_id);
  return {
    id: numeric ? `rb:${r.source_id}` : r.source_id,
    sourceId: r.source_id,
    artist: r.artist,
    title: r.title,
    camelot: (r.camelot as Camelot | null) ?? null,
    bpm: r.bpm === null ? null : Number(r.bpm),
    durationS: r.duration_s,
    genre: r.genre ?? undefined,
    label: r.label ?? undefined,
    energy: r.energy,
    rating: r.rating,
    tags: r.tags ?? [],
    location: r.location ?? undefined,
    addedAt: r.added_at ?? undefined,
  };
}

export function chunk<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Upserts the whole library in chunks of 500; returns a map of local id → cloud uuid. */
export async function pushTracks(
  sb: SupabaseClient,
  userId: string,
  tracks: Track[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  let done = 0;
  for (const part of chunk(tracks)) {
    const { data, error } = await sb
      .from('kc_tracks')
      .upsert(
        part.map((t) => toRow(t, userId)),
        { onConflict: 'user_id,source_id' },
      )
      .select('id, source_id');
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const local = part.find((t) => t.sourceId === row.source_id);
      if (local) ids.set(local.id, row.id);
    }
    done += part.length;
    onProgress?.(done, tracks.length);
  }
  return ids;
}

export async function pullTracks(
  sb: SupabaseClient,
): Promise<{ tracks: Track[]; cloudIds: Map<string, string> }> {
  const tracks: Track[] = [];
  const cloudIds = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('kc_tracks')
      .select('*')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as Array<TrackRow & { id: string }>) {
      const t = fromRow(r);
      tracks.push(t);
      cloudIds.set(t.id, r.id);
    }
    if (!data || data.length < 1000) break;
  }
  return { tracks, cloudIds };
}

export async function updateTrackFields(
  sb: SupabaseClient,
  cloudId: string,
  fields: { energy?: number | null; tags?: string[] },
) {
  const { error } = await sb.from('kc_tracks').update(fields).eq('id', cloudId);
  if (error) throw new Error(error.message);
}

/* ── Playlists ─────────────────────────────────────────────────────────────── */

/** Saves a playlist and its items; `cloudIds` maps local track ids to kc_tracks uuids. */
export async function savePlaylist(
  sb: SupabaseClient,
  userId: string,
  playlist: Playlist,
  cloudIds: Map<string, string>,
  transitionTypes: string[],
): Promise<string> {
  const row = {
    ...(playlist.cloudId ? { id: playlist.cloudId } : {}),
    user_id: userId,
    name: playlist.name,
    mode: playlist.settings.mode,
    target_curve: playlist.settings,
    is_public: playlist.isPublic ?? false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from('kc_playlists').upsert(row).select('id').single();
  if (error) throw new Error(error.message);
  const id = data.id as string;
  const del = await sb.from('kc_playlist_items').delete().eq('playlist_id', id);
  if (del.error) throw new Error(del.error.message);
  const items = playlist.items
    .map((it, i) => ({
      playlist_id: id,
      track_id: cloudIds.get(it.trackId),
      position: i,
      transition_type: i > 0 ? (transitionTypes[i - 1] ?? null) : null,
      note: it.note ?? null,
    }))
    .filter((r) => r.track_id);
  for (const part of chunk(items)) {
    const ins = await sb.from('kc_playlist_items').insert(part);
    if (ins.error) throw new Error(ins.error.message);
  }
  return id;
}

export async function loadPlaylists(
  sb: SupabaseClient,
  cloudToLocal: Map<string, string>,
): Promise<Playlist[]> {
  const { data, error } = await sb
    .from('kc_playlists')
    .select(
      'id, name, mode, target_curve, is_public, created_at, updated_at, kc_playlist_items(track_id, position, note)',
    )
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => {
    const items = (
      (p.kc_playlist_items as Array<{ track_id: string; position: number; note: string | null }>) ??
      []
    )
      .sort((a, b) => a.position - b.position)
      .map((it) => ({ trackId: cloudToLocal.get(it.track_id) ?? '', note: it.note ?? undefined }))
      .filter((it) => it.trackId);
    return {
      id: `cloud:${p.id}`,
      cloudId: p.id as string,
      name: p.name as string,
      settings: (p.target_curve as PlaylistSettings) ?? {
        mode: p.mode,
        dramaticEvery: 4,
        bpmTolerance: 6,
        keyLock: false,
      },
      items,
      isPublic: p.is_public as boolean,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
    };
  });
}

export async function deleteCloudPlaylist(sb: SupabaseClient, cloudId: string) {
  const { error } = await sb.from('kc_playlists').delete().eq('id', cloudId);
  if (error) throw new Error(error.message);
}

export async function setPlaylistPublic(sb: SupabaseClient, cloudId: string, isPublic: boolean) {
  const { error } = await sb.from('kc_playlists').update({ is_public: isPublic }).eq('id', cloudId);
  if (error) throw new Error(error.message);
}

/* ── Set studies ───────────────────────────────────────────────────────────── */

export async function saveStudy(
  sb: SupabaseClient,
  userId: string,
  study: SetStudy,
  parsed: unknown,
): Promise<void> {
  const { error } = await sb.from('kc_set_studies').upsert({
    user_id: userId,
    title: study.title,
    source_text: study.sourceText,
    parsed,
  });
  if (error) throw new Error(error.message);
}
