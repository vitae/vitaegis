/* KeyCrate import worker: parses rekordbox XML, Traktor NML or CSV off the main thread. */

import { parseLibraryText } from '@/lib/keycrate/library';
import type { Track } from '@/lib/keycrate/types';

export interface ImportRequest {
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
  try {
    const { tracks, playlists } = parseLibraryText(e.data.text, (p) =>
      ctx.postMessage({ type: 'progress', parsed: p.parsed, total: p.total }),
    );
    ctx.postMessage({ type: 'done', tracks, playlists });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
