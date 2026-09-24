/* KeyCrate · one entry point for every library file: rekordbox XML, Traktor NML or CSV.
   The format comes from the content, not the file name, so a renamed or extension-less
   export still imports. Used by the import worker and by the main-thread fallback. */

import { parseCsvTracks } from './csv';
import {
  describeUnsupportedXml,
  parseRekordboxXml,
  type ParseProgress,
  type ParseResult,
} from './rekordbox';
import { parseTraktorNml } from './traktor';

export type LibraryFormat = 'rekordbox' | 'traktor' | 'csv';

export function detectLibraryFormat(text: string): LibraryFormat {
  const head = text.replace(/^\uFEFF/, '').trimStart().slice(0, 5000);
  if (!head.startsWith('<')) return 'csv';
  return /<NML\b/i.test(head) ? 'traktor' : 'rekordbox';
}

export function parseLibraryText(
  text: string,
  onProgress?: (p: ParseProgress) => void,
): ParseResult & { format: LibraryFormat } {
  if (!text.trim()) throw new Error('That file is empty.');
  const format = detectLibraryFormat(text);
  if (format === 'traktor') return { ...parseTraktorNml(text, onProgress), format };
  if (format === 'rekordbox') {
    const unsupported = describeUnsupportedXml(text);
    if (unsupported) throw new Error(unsupported);
    return { ...parseRekordboxXml(text, onProgress), format };
  }
  const tracks = parseCsvTracks(text);
  if (!tracks.length) {
    throw new Error(
      'No tracks found. KeyCrate reads a rekordbox XML (File → Export Collection in xml format), a Traktor collection.nml, or a CSV with artist and title columns.',
    );
  }
  onProgress?.({ parsed: tracks.length, total: tracks.length });
  return { tracks, playlists: [], format };
}
