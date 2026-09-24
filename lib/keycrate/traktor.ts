/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · Traktor collection (.nml) parser
   Same hand-rolled scanning as rekordbox.ts so it runs in the import worker. Traktor
   writes one <ENTRY TITLE= ARTIST=> per track with INFO, TEMPO, MUSICAL_KEY, LOCATION
   and CUE_V2 children; playlists reference tracks by their LOCATION key.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { normalizeKey } from './camelot';
import { fallbackSourceId } from './csv';
import { parseAttrs, tagEnd, type ParseProgress, type ParseResult } from './rekordbox';
import type { Camelot, HotCue, TempoMark, Track } from './types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Traktor's MUSICAL_KEY VALUE: 0–11 major from C, 12–23 minor from Cm. */
export function traktorKeyValue(value: string | undefined): Camelot | null {
  const n = Number(value);
  if (value === undefined || value === '' || !Number.isInteger(n) || n < 0 || n > 23) return null;
  return normalizeKey(`${NOTE_NAMES[n % 12]}${n >= 12 ? 'm' : ''}`);
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** LOCATION VOLUME="Macintosh HD" DIR="/:Users/:dj/:Music/:" FILE="a.mp3" → a path and Traktor's key. */
function location(a: Record<string, string>): { path?: string; key?: string } {
  if (!a.FILE) return {};
  const volume = a.VOLUME ?? '';
  const dir = a.DIR ?? '';
  const key = `${volume}${dir}${a.FILE}`;
  const rel = `${dir.replace(/\/:/g, '/')}${a.FILE}`;
  // Windows volumes are drive letters; on macOS the boot volume maps to /.
  const path = /^[A-Za-z]:$/.test(volume) ? `${volume}${rel}` : rel;
  return { path, key };
}

/** First child tag of the given name inside an ENTRY body, as attributes. */
function child(body: string, tag: string): Record<string, string> {
  const m = body.match(new RegExp(`<${tag}\\b([^>]*)`, 'i'));
  return m ? parseAttrs(m[1]) : {};
}

export function parseTraktorNml(xml: string, onProgress?: (p: ParseProgress) => void): ParseResult {
  const tracks: Track[] = [];
  const byLocation = new Map<string, string>();
  const collStart = xml.search(/<COLLECTION\b/);
  const totalMatch = xml.match(/<COLLECTION[^>]*\bENTRIES="(\d+)"/);
  const total = totalMatch ? Number(totalMatch[1]) : null;
  const collEnd = xml.indexOf('</COLLECTION>');
  const end = collEnd === -1 ? xml.length : collEnd;

  let pos = collStart === -1 ? 0 : collStart;
  for (;;) {
    const start = xml.indexOf('<ENTRY', pos);
    if (start === -1 || start >= end) break;
    const close = tagEnd(xml, start);
    if (close === -1) break;
    const selfClosing = xml[close - 1] === '/';
    const a = parseAttrs(xml.slice(start + 6, selfClosing ? close - 1 : close));
    let body = '';
    pos = close + 1;
    if (!selfClosing) {
      const endTag = xml.indexOf('</ENTRY>', pos);
      body = xml.slice(pos, endTag === -1 ? end : endTag);
      pos = endTag === -1 ? end : endTag + 8;
    }
    if (!a.TITLE && !a.ARTIST) continue;

    const info = child(body, 'INFO');
    const tempoAttrs = child(body, 'TEMPO');
    const keyAttrs = child(body, 'MUSICAL_KEY');
    const album = child(body, 'ALBUM');
    const loc = location(child(body, 'LOCATION'));
    const durationS = num(info.PLAYTIME_FLOAT) ?? num(info.PLAYTIME);
    const bpm = num(tempoAttrs.BPM);
    const ranking = num(info.RANKING);

    const cues: HotCue[] = [];
    for (const m of body.matchAll(/<CUE_V2\b([^>]*)/gi)) {
      const c = parseAttrs(m[1]);
      const startMs = num(c.START);
      // TYPE 4 is the grid marker, not a cue.
      if (startMs === null || c.TYPE === '4') continue;
      cues.push({
        name: c.NAME && c.NAME !== 'n.n.' ? c.NAME : '',
        start: startMs / 1000,
        num: num(c.HOTCUE) ?? -1,
      });
    }
    const tempo: TempoMark[] = bpm && bpm > 0 ? [{ at: 0, bpm }] : [];

    const artist = a.ARTIST ?? '';
    const title = a.TITLE ?? '';
    const roundedDuration = durationS === null ? null : Math.round(durationS);
    const sourceId = fallbackSourceId(artist, title, roundedDuration);
    const keyRaw = info.KEY || keyAttrs.VALUE || undefined;
    tracks.push({
      id: sourceId,
      sourceId,
      artist,
      title,
      album: album.TITLE || undefined,
      camelot: normalizeKey(info.KEY) ?? traktorKeyValue(keyAttrs.VALUE),
      keyRaw,
      bpm: bpm && bpm > 0 ? Math.round(bpm * 100) / 100 : null,
      durationS: roundedDuration,
      genre: info.GENRE || undefined,
      label: info.LABEL || undefined,
      energy: null,
      // Traktor stores stars as 0–255 like rekordbox.
      rating: ranking === null ? null : Math.round(ranking / 51),
      tags: [],
      comments: info.COMMENT || undefined,
      location: loc.path,
      addedAt: info.IMPORT_DATE ? info.IMPORT_DATE.replace(/\//g, '-') : undefined,
      tempo: tempo.length ? tempo : undefined,
      cues: cues.length ? cues : undefined,
    });
    if (loc.key) byLocation.set(loc.key, sourceId);
    if (onProgress && tracks.length % 500 === 0) onProgress({ parsed: tracks.length, total });
  }
  onProgress?.({ parsed: tracks.length, total });

  if (!tracks.length) {
    throw new Error(
      'No tracks found in this Traktor collection. Import the collection.nml from your Traktor folder.',
    );
  }

  // Playlists: <NODE TYPE="PLAYLIST" NAME="…"> … <PRIMARYKEY TYPE="TRACK" KEY="volume/:dir/:file"/>
  const playlists: ParseResult['playlists'] = [];
  const plStart = xml.indexOf('<PLAYLISTS');
  if (plStart !== -1) {
    const nodeRe = /<NODE\b([^>]*)>/g;
    nodeRe.lastIndex = plStart;
    let m: RegExpExecArray | null;
    while ((m = nodeRe.exec(xml))) {
      const a = parseAttrs(m[1]);
      if (a.TYPE !== 'PLAYLIST') continue;
      const bodyEnd = xml.indexOf('</NODE>', m.index);
      const body = xml.slice(m.index, bodyEnd === -1 ? xml.length : bodyEnd);
      const ids = Array.from(body.matchAll(/<PRIMARYKEY\b([^>]*)/g), (x) => parseAttrs(x[1]).KEY)
        .map((k) => (k ? byLocation.get(k) : undefined))
        .filter((id): id is string => !!id);
      playlists.push({ name: a.NAME ?? '', trackIds: ids });
    }
  }
  return { tracks, playlists };
}
