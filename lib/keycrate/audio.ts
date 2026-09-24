/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · linking library tracks to audio files on a local folder / USB drive
   Nothing is uploaded: the browser reads the files from the folder the DJ picks.
   A rekordbox USB export keeps each file's original name under /Contents, so the
   file name from the library's Location is the primary key; artist + title is the
   fallback for files that were renamed or libraries without locations.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeName } from './tracklist';
import type { Track } from './types';

export const AUDIO_EXTENSIONS = [
  'wav',
  'aiff',
  'aif',
  'mp3',
  'flac',
  'm4a',
  'aac',
  'ogg',
  'opus',
  'alac',
  'mp4',
];
const AUDIO_RE = new RegExp(`\\.(${AUDIO_EXTENSIONS.join('|')})$`, 'i');

export function isAudioFile(name: string): boolean {
  // macOS writes "._name.wav" resource forks onto FAT/exFAT USB drives; they aren't audio.
  return AUDIO_RE.test(name) && !name.startsWith('._');
}

const stem = (name: string) => name.replace(/\.[^.]+$/, '');
const fileName = (path: string) => {
  let s = path;
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep as-is */
  }
  return s.split(/[\\/]/).pop() ?? s;
};

/** When the same song is on the drive in several formats, play the best one. */
const FORMAT_RANK: Record<string, number> = {
  wav: 0,
  aiff: 1,
  aif: 1,
  flac: 2,
  alac: 3,
  m4a: 4,
  mp3: 5,
};
const rank = (name: string) => FORMAT_RANK[name.split('.').pop()?.toLowerCase() ?? ''] ?? 9;

export interface AudioIndex<F> {
  /** lower-case file name → file (null when two files share a name, which can't identify either). */
  byName: Map<string, F | null>;
  /** normalized "artist title" / "title" from the file name → best-format file with that name. */
  byStem: Map<string, F>;
  count: number;
}

function put<F>(m: Map<string, F | null>, key: string, f: F) {
  if (!key) return;
  m.set(key, m.has(key) && m.get(key) !== f ? null : f);
}

/** Indexes audio files by name. `name` is the file name (not the path). */
export function buildAudioIndex<F>(files: Iterable<{ name: string; file: F }>): AudioIndex<F> {
  const byName = new Map<string, F | null>();
  const byStem = new Map<string, F>();
  const stemRank = new Map<string, number>();
  let count = 0;
  for (const { name, file } of files) {
    if (!isAudioFile(name)) continue;
    count++;
    put(byName, name.toLowerCase(), file);
    // "01 - Artist - Title.wav", "Artist - Title (Extended Mix).wav", "Artist_Title.wav"
    const s = stem(name)
      .replace(/_/g, ' ')
      .replace(/^\d{1,3}\s*[-.)]?\s+/, '');
    // "Song.wav" and "Song.mp3" are the same song: keep the WAV, then FLAC, then MP3.
    const key = normalizeName(s);
    if (key && (!stemRank.has(key) || rank(name) < stemRank.get(key)!)) {
      byStem.set(key, file);
      stemRank.set(key, rank(name));
    }
  }
  return { byName, byStem, count };
}

/** The audio file for a track, or null. */
export function findAudio<F>(track: Track, index: AudioIndex<F>): F | null {
  if (track.location) {
    const hit = index.byName.get(fileName(track.location).toLowerCase());
    if (hit) return hit;
  }
  const candidates = [
    `${track.artist} ${track.title}`,
    `${track.artist} - ${track.title}`,
    `${track.title} ${track.artist}`,
    // Libraries with no artist tag keep "Artist - Title" in the title itself.
    track.artist ? null : track.title,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const hit = index.byStem.get(normalizeName(c));
    if (hit) return hit;
  }
  return null;
}

/* ── Streaming helpers (used by /api/keycrate/audio/[id]) ─────────────────── */

const MIME_BY_EXT: Record<string, string> = {
  wav: 'audio/wav',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
};

export function audioMime(name: string, driveMime: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return (
    MIME_BY_EXT[ext] ?? (driveMime.startsWith('audio/') ? driveMime : 'application/octet-stream')
  );
}

/** Largest slice served per request, so one function call never streams a whole 100 MB WAV. */
export const CHUNK = 8 * 1024 * 1024;

/**
 * Turns the browser's Range header into the byte range to fetch from Drive, capped at CHUNK.
 * Returns null for "no range" (serve the whole file) and 'invalid' for an unsatisfiable one.
 */
export function planRange(
  header: string | null,
  size: number | null,
): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  let start: number;
  let end: number;
  if (m[1] === '') {
    // Suffix range: the last N bytes.
    if (size === null) return 'invalid';
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? start + CHUNK - 1 : Number(m[2]);
  }
  if (size !== null) {
    if (start >= size) return 'invalid';
    end = Math.min(end, size - 1);
  }
  end = Math.min(end, start + CHUNK - 1);
  return end < start ? 'invalid' : { start, end };
}
