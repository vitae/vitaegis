/* KeyCrate import worker: parses rekordbox XML or CSV off the main thread. */

import { parseCsvTracks } from '@/lib/keycrate/csv';
import { parseRekordboxXml } from '@/lib/keycrate/rekordbox';
import type { Track } from '@/lib/keycrate/types';

export interface ImportRequest {
  kind: 'xml' | 'csv';
  text: string;
}

export type ImportMessage =
  | { type: 'progress'; parsed: number; total: number | null }
  | { type: 'done'; tracks: Track[]; playlists: Array<{ name: string; trackIds: string[] }> }
  | { type: 'error'; message: string };

const ctx = self as unknown as {
  postMessage: (m: ImportMessage) => void;
  onmessage: ((e: MessageEvent<ImportRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { kind, text } = e.data;
  try {
    if (kind === 'csv') {
      const tracks = parseCsvTracks(text);
      ctx.postMessage({ type: 'done', tracks, playlists: [] });
      return;
    }
    const { tracks, playlists } = parseRekordboxXml(text, (p) =>
      ctx.postMessage({ type: 'progress', parsed: p.parsed, total: p.total }),
    );
    ctx.postMessage({ type: 'done', tracks, playlists });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
