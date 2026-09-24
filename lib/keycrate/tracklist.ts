/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · tracklist parsing and fuzzy library matching (Set Study)
   Accepts "0:00 Artist – Title (Remix)", numbered lists, 1001tracklists copy, tab- or
   comma-separated exports with a header (rekordbox/Serato history, KeyCrate CSV), M3U/M3U8
   playlists and rekordbox XML / Traktor NML files.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { parseCsv } from './csv';
import { parseLibraryText } from './library';
import type { Track } from './types';

export interface ParsedLine {
  raw: string;
  artist: string;
  title: string;
  remix: string | null;
  /** Seconds, when the line carried a timestamp. */
  timestamp: number | null;
  /** Unreleased / unknown "ID - ID" lines. */
  isId: boolean;
  /** File path, when the source carried one (M3U, XML exports): matched exactly first. */
  location?: string | null;
}

const DASHES = /\s+[-–—]\s+|\s+[-–—](?=\S)|(?<=\S)[–—]\s+/;

export function parseTimestamp(s: string): number | null {
  const m = s.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?$/);
  if (!m) return null;
  return m[3]
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[1]) * 60 + Number(m[2]);
}

/** Splits a "Title (Remix)" or "Title [Remix]" into its parts; only bracketed tails that look like mixes. */
function splitRemix(title: string): { title: string; remix: string | null } {
  const m = title.match(
    /^(.*?)\s*[([]([^)\]]*(?:mix|edit|remix|version|dub|bootleg|rework|vip|flip|extended)[^)\]]*)[)\]]\s*$/i,
  );
  if (!m) return { title: title.trim(), remix: null };
  return { title: m[1].trim(), remix: m[2].trim() };
}

/** Parses one line; null for blanks, headers and anything without an artist/title split. */
export function parseLine(raw: string): ParsedLine | null {
  let s = raw.trim();
  if (!s) return null;
  // Leading numbering, bullets, timestamps, and 1001tracklists "w/" markers.
  let timestamp: number | null = null;
  const ts = s.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:.]?\s*/);
  if (ts) {
    timestamp = parseTimestamp(ts[1]);
    s = s.slice(ts[0].length);
  }
  // "12.", "3)", "4 -", "#5", zero-padded "01 " (a bare "808 State" is an artist, so only padded numbers).
  s = s.replace(/^(?:\d{1,3}[.)]|\d{1,3}\s+[-–—]|#\d{1,3}\b|0\d{1,2}\s+|[-•*]|w\/)\s*/i, '');
  const ts2 = s.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:.]?\s*/);
  if (ts2 && timestamp === null) {
    timestamp = parseTimestamp(ts2[1]);
    s = s.slice(ts2[0].length);
  }
  // Trailing "[Label]" or "(Label)" after the title is common on 1001tracklists.
  s = s.replace(/\s*\[[^\]]*\]\s*$/, (m) =>
    /(mix|edit|remix|version|dub|bootleg|rework|vip)/i.test(m) ? m : '',
  );
  // Key/BPM tags DJ apps append: "… 8A 126", "… 126 BPM", "… (8A)".
  s = s
    .replace(
      /\s+[([]?(?:0?[1-9]|1[0-2])[AB](?:\s*[·|/-]?\s*\d{2,3}(?:\.\d+)?)?[)\]]?(?:\s*[Bb][Pp][Mm])?\s*$/,
      '',
    )
    .replace(/\s+\d{2,3}(?:\.\d+)?\s*bpm\s*$/i, '');
  if (!s) return null;
  if (/^id\s*[-–—]\s*id$/i.test(s) || /^id$/i.test(s)) {
    return { raw, artist: 'ID', title: 'ID', remix: null, timestamp, isId: true };
  }
  const parts = s.split(DASHES);
  if (parts.length < 2) return null;
  const artist = parts[0].trim();
  const rest = parts.slice(1).join(' - ').trim();
  const { title, remix } = splitRemix(rest);
  if (!artist || !title) return null;
  const isId = /^id$/i.test(artist) && /^id$/i.test(title);
  return { raw, artist, title, remix, timestamp, isId };
}

/* ── Whole-text parsing ───────────────────────────────────────────────────── */

const AUDIO_EXT = /\.(mp3|wav|aiff?|flac|m4a|aac|ogg|alac|wma|mp4)$/i;
const PATH_LIKE = /^(?:file:\/\/|\/|[A-Za-z]:[\\/]|\\\\)/;

const cleanText = (text: string) =>
  text
    .replace(/^﻿/, '')
    // A UTF-16 file read as UTF-8 leaves NULs between characters.
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n');

const blankLine = (raw: string): ParsedLine => ({
  raw,
  artist: '',
  title: '',
  remix: null,
  timestamp: null,
  isId: false,
});

/** "Artist - Title" from a file path's name, keeping the path for an exact match. */
function lineFromPath(raw: string): ParsedLine | null {
  const path = raw.trim();
  let base = path.replace(/^file:\/\/(localhost)?/i, '');
  try {
    base = decodeURIComponent(base);
  } catch {
    /* keep as-is */
  }
  base = base.split(/[\\/]/).pop()!.replace(AUDIO_EXT, '').replace(/_/g, ' ').trim();
  if (!base) return null;
  const parsed = parseLine(base);
  return parsed
    ? { ...parsed, raw, location: path }
    : { ...blankLine(raw), title: base, location: path };
}

const HEADER_TITLE = ['track title', 'title', 'name', 'track', 'track name', 'song'];
const HEADER_ARTIST = ['artist', 'artists', 'artist name', 'artist(s)'];
const HEADER_REMIX = ['mix', 'mix name', 'remixer', 'version'];
const HEADER_PATH = ['location', 'file', 'path', 'file path', 'filename', 'file name'];

/** Tables with a header row: rekordbox/Serato history exports, KeyCrate CSV, spreadsheets. */
function parseTable(lines: string[]): ParsedLine[] | null {
  const headerIdx = lines.findIndex((l) => l.trim());
  if (headerIdx === -1) return null;
  const header = lines[headerIdx];
  const tab = header.includes('\t');
  const split = (l: string) => (tab ? l.split('\t') : (parseCsv(l)[0] ?? []));
  if (!tab && !/[,;]/.test(header)) return null;
  const cols = split(header).map((c) =>
    c
      .trim()
      .toLowerCase()
      .replace(/^#\s*$/, '#'),
  );
  const find = (names: string[]) => cols.findIndex((c) => names.includes(c));
  const titleCol = find(HEADER_TITLE);
  const artistCol = find(HEADER_ARTIST);
  if (titleCol === -1 || artistCol === -1) return null;
  const remixCol = find(HEADER_REMIX);
  const pathCol = find(HEADER_PATH);
  const out: ParsedLine[] = [];
  for (const raw of lines.slice(headerIdx + 1)) {
    if (!raw.trim()) continue;
    const cells = split(raw).map((c) => c.trim());
    const titleCell = cells[titleCol] ?? '';
    if (!titleCell) continue;
    const { title, remix } = splitRemix(titleCell);
    const mixCell = remixCol === -1 ? '' : (cells[remixCol] ?? '');
    const artist = cells[artistCol] ?? '';
    const isId = /^id$/i.test(title) && (!artist || /^id$/i.test(artist));
    out.push({
      raw,
      artist,
      title,
      remix: remix ?? (mixCell && mixCell !== 'Original Mix' ? mixCell : null),
      timestamp: null,
      isId,
      location: pathCol === -1 ? null : cells[pathCol] || null,
    });
  }
  return out;
}

/** Tab-separated rows without a header: keep the text cells and let the matcher try both orders. */
function parseTabRow(raw: string): ParsedLine | null {
  const cells = raw
    .split('\t')
    .map((c) => c.trim())
    .filter(
      (c) =>
        c &&
        !/^\d+(?:[.,]\d+)?$/.test(c) && // numbers, BPM
        !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(c) && // durations
        !/^(?:0?[1-9]|1[0-2])[ABab]$/.test(c) && // Camelot
        !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(c), // dates
    );
  if (cells.length === 0) return null;
  if (cells.length === 1) return parseLine(cells[0]);
  const path = cells.find((c) => PATH_LIKE.test(c) || AUDIO_EXT.test(c)) ?? null;
  const text = cells.filter((c) => c !== path);
  // rekordbox history puts Track Title before Artist; matchTracklist also tries them swapped.
  const { title, remix } = splitRemix(text[0]);
  return { ...blankLine(raw), title, remix, artist: text[1] ?? '', location: path };
}

/** M3U/M3U8: "#EXTINF:265,Artist - Title" then the file path. */
function parseM3u(lines: string[]): ParsedLine[] {
  const out: ParsedLine[] = [];
  let pending: ParsedLine | null = null;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (/^#EXTINF:/i.test(l)) {
      if (pending) out.push(pending);
      const info = l.replace(/^#EXTINF:[^,]*,/i, '');
      pending = parseLine(info) ?? { ...blankLine(raw), title: info };
      continue;
    }
    if (l.startsWith('#')) continue;
    if (pending) {
      out.push({ ...pending, location: l });
      pending = null;
    } else {
      const fromPath = lineFromPath(l);
      if (fromPath) out.push(fromPath);
    }
  }
  if (pending) out.push(pending);
  return out;
}

/** rekordbox XML or Traktor NML pasted or uploaded as a tracklist: its playlist order if it has one. */
function parseXmlTracklist(text: string): ParsedLine[] {
  let parsed: ReturnType<typeof parseLibraryText>;
  try {
    parsed = parseLibraryText(text);
  } catch {
    return [];
  }
  const byId = new Map(parsed.tracks.map((t) => [t.id, t]));
  const bySource = new Map(parsed.tracks.map((t) => [t.sourceId, t]));
  const playlist = parsed.playlists.find((p) => p.trackIds.length);
  const ordered = playlist
    ? playlist.trackIds.map((id) => byId.get(id) ?? bySource.get(id)).filter((t): t is Track => !!t)
    : parsed.tracks;
  return ordered.map((t) => ({
    ...blankLine(`${t.artist} - ${t.title}`),
    artist: t.artist,
    title: t.title,
    location: t.location ?? null,
  }));
}

export function parseTracklist(text: string): ParsedLine[] {
  const clean = cleanText(text);
  const trimmed = clean.trimStart();
  if (trimmed.startsWith('<')) return parseXmlTracklist(clean);
  const lines = clean.split('\n');
  if (/^#EXTM3U/i.test(trimmed) || lines.some((l) => /^#EXTINF:/i.test(l.trim()))) {
    return parseM3u(lines);
  }
  const table = parseTable(lines);
  if (table) return table;
  return lines
    .map((raw) => {
      const l = raw.trim();
      if (!l) return null;
      if (l.includes('\t')) return parseTabRow(raw);
      if (PATH_LIKE.test(l) && AUDIO_EXT.test(l)) return lineFromPath(raw);
      return parseLine(raw);
    })
    .filter((l): l is ParsedLine => l !== null);
}

/* ── Fuzzy matching ────────────────────────────────────────────────────────── */

/** Lower-case, strip accents, unify "feat." / "&" / "and", drop brackets and punctuation. */
export function normalizeName(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/\b(feat|ft|featuring)\.?\s+/g, ' ')
      .replace(/\s*&\s*|\s+and\s+|\s*,\s*|\s+x\s+|\s+vs\.?\s+/g, ' ')
      .replace(/\b(original|extended|radio|club)\s+(mix|edit|version)\b/g, ' ')
      // Letters and digits in any script, so Japanese or Cyrillic names still compare.
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice similarity on character bigrams, 0…1. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [g, c] of ga) {
    total += c;
    inter += Math.min(c, gb.get(g) ?? 0);
  }
  for (const [, c] of gb) total += c;
  return (2 * inter) / total;
}

export type MatchStatus = 'matched' | 'missing' | 'id';

export interface LineMatch {
  line: ParsedLine;
  status: MatchStatus;
  track: Track | null;
  confidence: number;
  /** Closest library track when nothing cleared the threshold, to offer as a manual pick. */
  candidate: Track | null;
}

export const MATCH_THRESHOLD = 0.72;

/** Comparable form of a file path: decoded, forward slashes, no file:// prefix, lower case. */
export function normalizePath(p: string): string {
  let s = p.trim().replace(/^file:\/\/(localhost)?/i, '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep as-is */
  }
  s = s.replace(/\\/g, '/').replace(/^\/([A-Za-z]:\/)/, '$1');
  return s.toLowerCase();
}

const basename = (p: string) => p.split('/').pop() ?? p;

/** Matches each parsed line to the closest library track above the threshold. */
export function matchTracklist(lines: ParsedLine[], library: Track[]): LineMatch[] {
  const index = library.map((track) => ({
    track,
    artist: normalizeName(track.artist),
    title: normalizeName(track.title),
    full: normalizeName(`${track.artist} ${track.title}`),
  }));
  const byPath = new Map<string, Track>();
  const byFile = new Map<string, Track | null>();
  for (const t of library) {
    if (!t.location) continue;
    const p = normalizePath(t.location);
    byPath.set(p, t);
    const f = basename(p);
    // A file name shared by two tracks can't identify either.
    byFile.set(f, byFile.has(f) ? null : t);
  }

  return lines.map((line) => {
    if (line.isId) return { line, status: 'id', track: null, confidence: 0, candidate: null };
    if (line.location) {
      const p = normalizePath(line.location);
      const exact = byPath.get(p) ?? byFile.get(basename(p));
      if (exact) return { line, status: 'matched', track: exact, confidence: 1, candidate: null };
    }
    const artist = normalizeName(line.artist);
    const title = normalizeName(line.remix ? `${line.title} ${line.remix}` : line.title);
    const titleOnly = normalizeName(line.title);
    const full = normalizeName(`${line.artist} ${line.title}`);
    let best: { track: Track; score: number } | null = null;
    for (const e of index) {
      const t = Math.max(similarity(title, e.title), similarity(titleOnly, e.title) * 0.97);
      let score: number;
      if (!artist) {
        // No artist on the line (a bare file name): the title has to carry it.
        score = Math.max(t * 0.95, similarity(titleOnly, e.full));
      } else {
        const a = similarity(artist, e.artist);
        const f = similarity(full, e.full);
        // Also try the columns the other way round ("Title - Artist", untitled table rows).
        const swapped = 0.45 * similarity(titleOnly, e.artist) + 0.55 * similarity(artist, e.title);
        score = Math.max(0.45 * a + 0.55 * t, f, swapped);
      }
      if (!best || score > best.score) best = { track: e.track, score };
    }
    if (best && best.score >= MATCH_THRESHOLD) {
      return {
        line,
        status: 'matched',
        track: best.track,
        confidence: best.score,
        candidate: null,
      };
    }
    return {
      line,
      status: 'missing',
      track: null,
      confidence: best?.score ?? 0,
      candidate: best && best.score >= 0.4 ? best.track : null,
    };
  });
}
