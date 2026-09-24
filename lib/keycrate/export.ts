/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · exports
   rekordbox playlist XML (re-import with cues intact), M3U8, CSV.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { setTransitions, TRANSITION_LABEL } from './harmonic';
import type { PlaylistSettings, Track } from './types';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Path → the file://localhost/… form rekordbox writes. */
export function pathToLocation(path: string): string {
  if (/^file:\/\//.test(path)) return path;
  const normalized = path.replace(/\\/g, '/');
  const withSlash = /^[A-Za-z]:\//.test(normalized) ? `/${normalized}` : normalized;
  return `file://localhost${encodeURI(withSlash).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
}

/**
 * A rekordbox collection file holding just this set: the COLLECTION carries each
 * track's TrackID and Location (rekordbox matches on those and keeps its own cues), and a
 * PLAYLISTS node references them in order.
 */
export function toRekordboxXml(name: string, tracks: Track[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<DJ_PLAYLISTS Version="1.0.0">',
    '  <PRODUCT Name="KeyCrate" Version="1.0" Company="Vitaegis"/>',
    `  <COLLECTION Entries="${tracks.length}">`,
  ];
  tracks.forEach((t, i) => {
    const id = t.sourceId && /^\d+$/.test(t.sourceId) ? t.sourceId : String(1_000_000 + i);
    const attrs = [
      `TrackID="${escapeXml(id)}"`,
      `Name="${escapeXml(t.title)}"`,
      `Artist="${escapeXml(t.artist)}"`,
      t.album ? `Album="${escapeXml(t.album)}"` : '',
      t.genre ? `Genre="${escapeXml(t.genre)}"` : '',
      t.label ? `Label="${escapeXml(t.label)}"` : '',
      t.durationS !== null ? `TotalTime="${t.durationS}"` : '',
      t.bpm !== null ? `AverageBpm="${t.bpm.toFixed(2)}"` : '',
      t.camelot ? `Tonality="${t.camelot}"` : '',
      t.location ? `Location="${escapeXml(pathToLocation(t.location))}"` : '',
    ].filter(Boolean);
    lines.push(`    <TRACK ${attrs.join(' ')}/>`);
  });
  lines.push('  </COLLECTION>', '  <PLAYLISTS>', '    <NODE Type="0" Name="ROOT" Count="1">');
  lines.push(`      <NODE Name="${escapeXml(name)}" Type="1" KeyType="0" Entries="${tracks.length}">`);
  tracks.forEach((t, i) => {
    const id = t.sourceId && /^\d+$/.test(t.sourceId) ? t.sourceId : String(1_000_000 + i);
    lines.push(`        <TRACK Key="${escapeXml(id)}"/>`);
  });
  lines.push('      </NODE>', '    </NODE>', '  </PLAYLISTS>', '</DJ_PLAYLISTS>', '');
  return lines.join('\n');
}

export function toM3u8(name: string, tracks: Track[]): string {
  const lines = ['#EXTM3U', `#PLAYLIST:${name}`];
  for (const t of tracks) {
    lines.push(`#EXTINF:${t.durationS ?? -1},${t.artist} - ${t.title}`);
    lines.push(t.location ?? `${t.artist} - ${t.title}`);
  }
  return lines.join('\n') + '\n';
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(tracks: Track[], settings: PlaylistSettings): string {
  const transitions = setTransitions(tracks, settings);
  const rows = [['position', 'artist', 'title', 'key', 'bpm', 'duration', 'energy', 'genre', 'label', 'transition', 'bpm change %']];
  tracks.forEach((t, i) => {
    const tr = i > 0 ? transitions[i - 1] : null;
    rows.push([
      String(i + 1),
      t.artist,
      t.title,
      t.camelot ?? '',
      t.bpm === null ? '' : String(t.bpm),
      t.durationS === null ? '' : String(t.durationS),
      t.energy === null ? '' : String(t.energy),
      t.genre ?? '',
      t.label ?? '',
      tr ? TRANSITION_LABEL[tr.type] : '',
      tr && tr.bpmChangePct !== null ? tr.bpmChangePct.toFixed(1) : '',
    ]);
  });
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function safeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'keycrate-set';
}
