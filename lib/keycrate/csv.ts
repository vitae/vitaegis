/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · CSV import (Beatport and other exports)
   Expects a header row with some of: artist, title, key, bpm, genre, duration.
   Header matching is loose ("Artists", "Track Title", "Length", "Time" all work).
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeKey } from './camelot';
import type { Track } from './types';

/** RFC 4180-ish parser: quoted fields, doubled quotes, CRLF, comma or semicolon or tab. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const delim = detectDelimiter(text);
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function detectDelimiter(text: string): string {
  const head = text.slice(0, 2000).split(/\r?\n/)[0] ?? '';
  const counts: Array<[string, number]> = [',', ';', '\t'].map((d) => [d, head.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

const COLUMN_ALIASES: Record<string, string[]> = {
  artist: ['artist', 'artists', 'artist name'],
  title: ['title', 'track', 'track title', 'name', 'track name', 'song'],
  key: ['key', 'camelot', 'tonality', 'initial key', 'initialkey'],
  bpm: ['bpm', 'tempo', 'average bpm'],
  genre: ['genre', 'style'],
  duration: ['duration', 'length', 'time', 'total time'],
  label: ['label'],
  album: ['album', 'release'],
  energy: ['energy'],
  rating: ['rating', 'stars'],
  comments: ['comment', 'comments'],
  location: ['location', 'path', 'file', 'filename'],
  id: ['id', 'trackid', 'track id'],
};

export function mapHeader(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/[_-]/g, ' ');
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (map[field] === undefined && aliases.includes(key)) map[field] = i;
    }
  });
  return map;
}

/** "5:32", "05:32.4", "1:02:15", or plain seconds → seconds. */
export function parseDuration(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const parts = s.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return null;
}

/** FNV-1a over a string, as 8 hex chars. Stable across imports. */
export function stableHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Identity for tracks with no TrackID: artist + title + duration, case-folded. */
export function fallbackSourceId(artist: string, title: string, durationS: number | null): string {
  return `h:${stableHash(`${artist.trim().toLowerCase()}|${title.trim().toLowerCase()}|${durationS ?? ''}`)}`;
}

export function parseCsvTracks(text: string): Track[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const map = mapHeader(rows[0]);
  if (map.title === undefined) return [];
  const out: Track[] = [];
  const get = (row: string[], f: string) => (map[f] === undefined ? undefined : row[map[f]]?.trim());
  for (const row of rows.slice(1)) {
    const title = get(row, 'title') ?? '';
    if (!title) continue;
    const artist = get(row, 'artist') ?? '';
    const durationS = parseDuration(get(row, 'duration'));
    const bpmRaw = Number(get(row, 'bpm'));
    const energyRaw = Number(get(row, 'energy'));
    const ratingRaw = Number(get(row, 'rating'));
    const id = get(row, 'id');
    const sourceId = id ? `csv:${id}` : fallbackSourceId(artist, title, durationS);
    const keyRaw = get(row, 'key');
    out.push({
      id: sourceId,
      sourceId,
      artist,
      title,
      album: get(row, 'album') || undefined,
      camelot: normalizeKey(keyRaw),
      keyRaw: keyRaw || undefined,
      bpm: Number.isFinite(bpmRaw) && bpmRaw > 0 ? Math.round(bpmRaw * 100) / 100 : null,
      durationS,
      genre: get(row, 'genre') || undefined,
      label: get(row, 'label') || undefined,
      energy: Number.isFinite(energyRaw) && energyRaw >= 1 && energyRaw <= 10 ? Math.round(energyRaw) : null,
      rating: Number.isFinite(ratingRaw) && ratingRaw >= 0 && ratingRaw <= 5 ? Math.round(ratingRaw) : null,
      tags: [],
      comments: get(row, 'comments') || undefined,
      location: get(row, 'location') || undefined,
    });
  }
  return out;
}
