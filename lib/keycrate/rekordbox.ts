/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · rekordbox collection XML parser
   A hand-rolled scanner rather than DOMParser so it runs inside a Web Worker and
   copes with 20k+ tracks without building a DOM. rekordbox writes one <TRACK …/>
   element per track with optional <TEMPO/> and <POSITION_MARK/> children.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeKey } from './camelot';
import type { HotCue, TempoMark, Track } from './types';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const code =
        e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const ATTR_RE = /([A-Za-z_][\w.-]*)\s*=\s*"([^"]*)"/g;

export function parseAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(tag))) out[m[1]] = decodeEntities(m[2]);
  return out;
}

/** file://localhost/C:/Music/x.mp3 → C:/Music/x.mp3 (decoded). Keeps other forms as-is. */
export function locationToPath(location: string): string {
  let s = location.replace(/^file:\/\/localhost/, '').replace(/^file:\/\//, '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* leave undecodable paths alone */
  }
  if (/^\/[A-Za-z]:\//.test(s)) s = s.slice(1);
  return s;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function trackFromAttrs(
  a: Record<string, string>,
  tempo: TempoMark[],
  cues: HotCue[],
): Track | null {
  const trackId = a.TrackID;
  if (!trackId) return null;
  const bpm = num(a.AverageBpm);
  const rating = num(a.Rating);
  return {
    id: `rb:${trackId}`,
    sourceId: trackId,
    artist: a.Artist ?? '',
    title: a.Name ?? '',
    album: a.Album || undefined,
    camelot: normalizeKey(a.Tonality),
    keyRaw: a.Tonality || undefined,
    bpm: bpm && bpm > 0 ? Math.round(bpm * 100) / 100 : null,
    durationS: num(a.TotalTime),
    genre: a.Genre || undefined,
    label: a.Label || undefined,
    energy: null,
    // rekordbox stores stars as 0/51/102/153/204/255.
    rating: rating === null ? null : Math.round(rating / 51),
    tags: [],
    comments: a.Comments || undefined,
    location: a.Location ? locationToPath(a.Location) : undefined,
    addedAt: a.DateAdded || undefined,
    tempo: tempo.length ? tempo : undefined,
    cues: cues.length ? cues : undefined,
  };
}

/** Index of the `>` that closes the tag opened before `from`, skipping `>` inside quoted values. */
function tagEnd(xml: string, from: number): number {
  let quote = '';
  for (let i = from; i < xml.length; i++) {
    const c = xml[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * Thrown for XML that isn't a rekordbox collection, so the UI can say what the file is and how
 * to export the right one instead of silently importing nothing.
 */
export function describeUnsupportedXml(xml: string): string | null {
  const head = xml.slice(0, 5000);
  const howTo = 'In rekordbox use File → Export Collection in xml format, then import that file.';
  // Traktor's .nml also has a <COLLECTION>, so rule it out first.
  if (/<NML\b/i.test(head)) {
    return `This is a Traktor collection (.nml), not a rekordbox XML. ${howTo}`;
  }
  if (/<plist\b/i.test(head)) {
    return `This is an Apple Music / iTunes library, not a rekordbox XML. ${howTo}`;
  }
  if (/<DJ_PLAYLISTS\b/.test(head) || /<COLLECTION\b/.test(head)) return null;
  return `This XML isn't a rekordbox collection. ${howTo}`;
}

export interface ParseProgress {
  parsed: number;
  total: number | null;
}

export interface ParseResult {
  tracks: Track[];
  /** rekordbox playlists found in the file: name plus TrackIDs, for reference. */
  playlists: Array<{ name: string; trackIds: string[] }>;
}

/**
 * Parses the whole XML string. `onProgress` fires every 500 tracks so the worker can
 * report back without flooding the main thread.
 */
export function parseRekordboxXml(
  xml: string,
  onProgress?: (p: ParseProgress) => void,
): ParseResult {
  const unsupported = describeUnsupportedXml(xml);
  if (unsupported) throw new Error(unsupported);
  const tracks: Track[] = [];
  const totalMatch = xml.match(/<COLLECTION[^>]*\bEntries="(\d+)"/);
  const total = totalMatch ? Number(totalMatch[1]) : null;

  let pos = 0;
  const collectionEnd = xml.indexOf('</COLLECTION>');
  const end = collectionEnd === -1 ? xml.length : collectionEnd;
  for (;;) {
    const start = xml.indexOf('<TRACK', pos);
    if (start === -1 || start >= end) break;
    // Titles like "Up -> Down" may carry an unescaped '>', which is legal inside attributes.
    const close = tagEnd(xml, start);
    if (close === -1) break;
    const selfClosing = xml[close - 1] === '/';
    const attrs = parseAttrs(xml.slice(start + 6, selfClosing ? close - 1 : close));
    const tempo: TempoMark[] = [];
    const cues: HotCue[] = [];
    pos = close + 1;
    if (!selfClosing) {
      const endTag = xml.indexOf('</TRACK>', pos);
      const inner = xml.slice(pos, endTag === -1 ? end : endTag);
      const childRe = /<(TEMPO|POSITION_MARK)\b([^>]*)\/?>/g;
      let m: RegExpExecArray | null;
      while ((m = childRe.exec(inner))) {
        const c = parseAttrs(m[2]);
        if (m[1] === 'TEMPO') {
          const at = num(c.Inizio);
          const bpm = num(c.Bpm);
          if (at !== null && bpm !== null) tempo.push({ at, bpm });
        } else {
          const start = num(c.Start);
          if (start !== null) cues.push({ name: c.Name ?? '', start, num: num(c.Num) ?? -1 });
        }
      }
      pos = endTag === -1 ? end : endTag + 8;
    }
    const t = trackFromAttrs(attrs, tempo, cues);
    if (t) {
      tracks.push(t);
      if (onProgress && tracks.length % 500 === 0) onProgress({ parsed: tracks.length, total });
    }
  }
  onProgress?.({ parsed: tracks.length, total });

  // Playlists: <NODE Type="1" Name="…"> with <TRACK Key="id"/> children.
  const playlists: ParseResult['playlists'] = [];
  const plStart = xml.indexOf('<PLAYLISTS>');
  if (plStart !== -1) {
    const nodeRe = /<NODE\b([^>]*)>/g;
    nodeRe.lastIndex = plStart;
    let m: RegExpExecArray | null;
    while ((m = nodeRe.exec(xml))) {
      const a = parseAttrs(m[1]);
      if (a.Type !== '1') continue;
      const bodyEnd = xml.indexOf('</NODE>', m.index);
      const body = xml.slice(m.index, bodyEnd === -1 ? xml.length : bodyEnd);
      const ids = Array.from(body.matchAll(/<TRACK\s+Key="(\d+)"/g), (x) => x[1]);
      playlists.push({ name: a.Name ?? '', trackIds: ids });
    }
  }
  if (!tracks.length) {
    throw new Error(
      'No tracks found in this rekordbox file. Export the whole collection (File → Export Collection in xml format), not a single playlist.',
    );
  }
  return { tracks, playlists };
}
