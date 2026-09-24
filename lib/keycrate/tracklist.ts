/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · tracklist parsing and fuzzy library matching (Set Study)
   Accepts "0:00 Artist – Title (Remix)", numbered lists and 1001tracklists copy.
   ═══════════════════════════════════════════════════════════════════════════════ */

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
}

const DASHES = /\s+[-–—]\s+|\s+[-–—](?=\S)|(?<=\S)[–—]\s+/;

export function parseTimestamp(s: string): number | null {
  const m = s.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?$/);
  if (!m) return null;
  return m[3] ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
}

/** Splits a "Title (Remix)" or "Title [Remix]" into its parts; only bracketed tails that look like mixes. */
function splitRemix(title: string): { title: string; remix: string | null } {
  const m = title.match(/^(.*?)\s*[([]([^)\]]*(?:mix|edit|remix|version|dub|bootleg|rework|vip|flip|extended)[^)\]]*)[)\]]\s*$/i);
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
  s = s.replace(/^(?:\d{1,3}[.)]|\d{1,3}\s+[-–—]|[-•*]|w\/)\s*/i, '');
  const ts2 = s.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:.]?\s*/);
  if (ts2 && timestamp === null) {
    timestamp = parseTimestamp(ts2[1]);
    s = s.slice(ts2[0].length);
  }
  // Trailing "[Label]" or "(Label)" after the title is common on 1001tracklists.
  s = s.replace(/\s*\[[^\]]*\]\s*$/, (m) => (/(mix|edit|remix|version|dub|bootleg|rework|vip)/i.test(m) ? m : ''));
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

export function parseTracklist(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((l): l is ParsedLine => l !== null);
}

/* ── Fuzzy matching ────────────────────────────────────────────────────────── */

/** Lower-case, strip accents, unify "feat." / "&" / "and", drop brackets and punctuation. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\.?\s+/g, ' ')
    .replace(/\s*&\s*|\s+and\s+|\s*,\s*|\s+x\s+|\s+vs\.?\s+/g, ' ')
    .replace(/\b(original|extended|radio|club)\s+(mix|edit|version)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
}

export const MATCH_THRESHOLD = 0.72;

/** Matches each parsed line to the closest library track above the threshold. */
export function matchTracklist(lines: ParsedLine[], library: Track[]): LineMatch[] {
  const index = library.map((track) => ({
    track,
    artist: normalizeName(track.artist),
    title: normalizeName(track.title),
    full: normalizeName(`${track.artist} ${track.title}`),
  }));
  return lines.map((line) => {
    if (line.isId) return { line, status: 'id', track: null, confidence: 0 };
    const artist = normalizeName(line.artist);
    const title = normalizeName(line.remix ? `${line.title} ${line.remix}` : line.title);
    const titleOnly = normalizeName(line.title);
    let best: { track: Track; score: number } | null = null;
    for (const e of index) {
      const a = similarity(artist, e.artist);
      const t = Math.max(similarity(title, e.title), similarity(titleOnly, e.title) * 0.97);
      const f = similarity(`${artist} ${title}`, e.full);
      const score = Math.max(0.45 * a + 0.55 * t, f);
      if (!best || score > best.score) best = { track: e.track, score };
    }
    if (best && best.score >= MATCH_THRESHOLD) {
      return { line, status: 'matched', track: best.track, confidence: best.score };
    }
    return { line, status: 'missing', track: null, confidence: best?.score ?? 0 };
  });
}
