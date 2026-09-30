/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · duplicate songs
   The same song often arrives more than once: rekordbox holds a Bandcamp and a
   USB copy of one album, older exports cut titles short ("Relish The T"), and a
   linked folder adds rows for files an imported row already plays under another
   name. Duplicates collapse into the best row; playlists follow it.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { isFileTrack } from './file-tracks';
import { splitPackedName } from './rekordbox';
import type { Track } from './types';

const PLAIN_VERSION = /\((original|extended|radio|album|clean|explicit) (mix|version|edit)\)/gi;
/** Titles this long or longer may match a longer title they start (truncated exports). */
const MIN_PREFIX = 8;
const VERSION_WORD =
  /vip|remix|mix|edit|dub|flip|bootleg|version|rework|live|instrumental|acoustic|acapella|refix/;
/** Seconds two copies of one song may differ by. */
const SAME_LENGTH_S = 2;

/** Letters and digits only; unlike normalizeName, bracketed version words ("(VIP Mix)") stay. */
function compact(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(PLAIN_VERSION, ' ')
    .replace(/\b(feat|ft|featuring)\b.*$/, ' ')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

interface Keyed {
  track: Track;
  artist: string;
  title: string;
}

function keyed(track: Track): Keyed {
  const n = splitPackedName(track.artist, track.title);
  return {
    track,
    artist: compact(n.artist),
    title: compact(n.title),
  };
}

function sameSong(a: Keyed, b: Keyed): boolean {
  if (!a.title || !b.title) return false;
  if (a.artist && b.artist && a.artist !== b.artist) return false;
  const da = a.track.durationS;
  const db = b.track.durationS;
  const bothTimed = da !== null && db !== null;
  if (bothTimed && Math.abs(da - db) > SAME_LENGTH_S) return false;
  if (a.title === b.title) return true;
  // A cut-short title only counts when the lengths agree, so "Song" never swallows "Song VIP".
  if (!bothTimed) return false;
  const [short, long] = a.title.length <= b.title.length ? [a.title, b.title] : [b.title, a.title];
  if (short.length < MIN_PREFIX || !long.startsWith(short)) return false;
  // "Song" and "Song VIP" / "Song (Remix)" are different songs even at the same length.
  return !VERSION_WORD.test(long.slice(short.length));
}

/** Higher is better: the row whose cues, analysis and ratings we keep. */
function quality(t: Track): number[] {
  const loc = (t.location ?? '').replace(/\\/g, '/');
  return [
    isFileTrack(t) ? 0 : 1,
    t.camelot && t.bpm ? 1 : 0,
    t.cues?.length ?? 0,
    t.comments ? 1 : 0,
    /\/Contents\//i.test(loc) ? 0 : 1, // rekordbox's own USB copies come last
    t.rating ?? 0,
    t.tags.length,
    t.energy === null ? 0 : 1,
  ];
}

function better(a: Track, b: Track): boolean {
  const qa = quality(a);
  const qb = quality(b);
  for (let i = 0; i < qa.length; i++) if (qa[i] !== qb[i]) return qa[i] > qb[i];
  return a.id < b.id; // stable choice between equals
}

/** Duplicate row id → id of the row it collapses into. */
export function findDuplicates(tracks: Track[]): Map<string, string> {
  const rows = tracks.map(keyed);
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // Candidates share the first MIN_PREFIX characters of the title, so this stays near-linear.
  const buckets = new Map<string, number[]>();
  rows.forEach((r, i) => {
    if (!r.title) return;
    const k = r.title.slice(0, MIN_PREFIX);
    const list = buckets.get(k);
    if (list) list.push(i);
    else buckets.set(k, [i]);
  });
  for (const list of buckets.values())
    for (let x = 0; x < list.length; x++)
      for (let y = x + 1; y < list.length; y++)
        if (sameSong(rows[list[x]], rows[list[y]])) parent[find(list[y])] = find(list[x]);

  const groups = new Map<number, Track[]>();
  rows.forEach((r, i) => {
    const g = groups.get(find(i));
    if (g) g.push(r.track);
    else groups.set(find(i), [r.track]);
  });
  const out = new Map<string, string>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const keep = g.reduce((best, t) => (better(t, best) ? t : best));
    for (const t of g) if (t.id !== keep.id) out.set(t.id, keep.id);
  }
  return out;
}

/** The kept row, topped up with anything only the duplicate had. */
function absorb(keep: Track, dup: Track): Track {
  return {
    ...keep,
    camelot: keep.camelot ?? dup.camelot,
    bpm: keep.bpm ?? dup.bpm,
    durationS: keep.durationS ?? dup.durationS,
    energy: keep.energy ?? dup.energy,
    rating: Math.max(keep.rating ?? 0, dup.rating ?? 0) || keep.rating,
    tags: Array.from(new Set([...keep.tags, ...dup.tags])),
    comments: keep.comments ?? dup.comments,
    cues: keep.cues?.length ? keep.cues : dup.cues,
  };
}

/** The library without duplicates, plus the id remap for playlists and the current set. */
export function dedupeTracks(tracks: Track[]): { tracks: Track[]; remap: Map<string, string> } {
  const remap = findDuplicates(tracks);
  if (!remap.size) return { tracks, remap };
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const kept = new Map<string, Track>();
  for (const [dupId, keepId] of remap) {
    const base = kept.get(keepId) ?? byId.get(keepId)!;
    kept.set(keepId, absorb(base, byId.get(dupId)!));
  }
  return {
    tracks: tracks.filter((t) => !remap.has(t.id)).map((t) => kept.get(t.id) ?? t),
    remap,
  };
}

/** Playlist or set items pointed at the kept rows, without a song listed twice in a row. */
export function remapItems<T extends { trackId: string }>(
  items: T[],
  remap: Map<string, string>,
): T[] {
  if (!remap.size) return items;
  const out: T[] = [];
  for (const it of items) {
    const next = { ...it, trackId: remap.get(it.trackId) ?? it.trackId };
    if (out.length && out[out.length - 1].trackId === next.trackId) continue;
    out.push(next);
  }
  return out;
}
