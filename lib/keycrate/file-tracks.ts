/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · library tracks from audio files
   A linked folder (USB or Google Drive) can hold songs the imported library doesn't
   know about, or there may be no import at all. Each unmatched file becomes a track:
   artist and title from "Artist - Title.wav", and key / BPM from the file name when
   it carries them ("8A - 124 - Artist - Title", Mixed In Key style) until the file's
   own tags are read. A later rekordbox import replaces these rows with the real ones.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { buildAudioIndex, findAudio } from './audio';
import { normalizeKey } from './camelot';
import { stableHash } from './csv';
import type { Track } from './types';

export const FILE_TRACK_PREFIX = 'file:';
export const isFileTrack = (t: Track) => t.id.startsWith(FILE_TRACK_PREFIX);

const CAMELOT_RE = /^(0?[1-9]|1[0-2])\s*[AB]$/i;
const BPM_RE = /^(\d{2,3}(?:\.\d+)?)\s*(?:bpm)?$/i;

/** A track for one audio file, read from its name. */
export function trackFromFileName(name: string): Track {
  const stem = name
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .replace(/^\d{1,3}\s*[-.)]\s*/, '')
    .trim();
  let camelot: Track['camelot'] = null;
  let bpm: number | null = null;
  const parts: string[] = [];
  for (const raw of stem.split(/\s+[-–—]\s+/)) {
    const seg = raw.trim();
    if (!seg) continue;
    if (!camelot && CAMELOT_RE.test(seg)) {
      camelot = normalizeKey(seg.replace(/\s+/g, '').replace(/^0/, '').toUpperCase());
      continue;
    }
    const m = seg.match(BPM_RE);
    if (!bpm && m && Number(m[1]) >= 60 && Number(m[1]) <= 200) {
      bpm = Number(m[1]);
      continue;
    }
    parts.push(seg);
  }
  const artist = parts.length > 1 ? parts[0] : '';
  const title = (parts.length > 1 ? parts.slice(1).join(' - ') : parts[0]) || stem || name;
  const id = `${FILE_TRACK_PREFIX}${stableHash(name.toLowerCase())}`;
  return {
    id,
    sourceId: id,
    artist,
    title,
    camelot,
    bpm,
    durationS: null,
    energy: null,
    rating: null,
    tags: [],
    location: name,
  };
}

/** Tracks for the files no library track plays, skipping ones already added. */
export function newFileTracks(files: { name: string }[], existing: Track[]): Track[] {
  const index = buildAudioIndex(files.map((f) => ({ name: f.name, file: f.name.toLowerCase() })));
  const taken = new Set<string>();
  const have = new Set<string>();
  for (const t of existing) {
    if (isFileTrack(t)) have.add(t.id);
    else {
      const hit = findAudio(t, index);
      if (hit) taken.add(hit);
    }
  }
  const out = new Map<string, Track>();
  for (const f of files) {
    const key = f.name.toLowerCase();
    if (taken.has(key)) continue;
    const t = trackFromFileName(f.name);
    if (have.has(t.id) || out.has(t.id)) continue;
    out.set(t.id, t);
  }
  return Array.from(out.values());
}

/** File tracks that an imported track now covers (same file): file track id → real track id. */
export function supersededFileTracks(tracks: Track[]): Map<string, string> {
  const fileTracks = tracks.filter(isFileTrack);
  const out = new Map<string, string>();
  if (!fileTracks.length) return out;
  const index = buildAudioIndex(fileTracks.map((t) => ({ name: t.location ?? '', file: t.id })));
  for (const t of tracks) {
    if (isFileTrack(t)) continue;
    const hit = findAudio(t, index);
    if (hit && !out.has(hit)) out.set(hit, t.id);
  }
  return out;
}
