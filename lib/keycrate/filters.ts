/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · library filtering
   One pass over the library; the search index is pre-lowercased per track so a
   20k-track crate filters in a few milliseconds.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { needsAnalysis } from './merge';
import type { Camelot, Track } from './types';

export interface LibraryFilters {
  query: string;
  keys: Set<Camelot>;
  bpmMin: number | null;
  bpmMax: number | null;
  genres: Set<string>;
  energyMin: number | null;
  ratingMin: number | null;
  unusedOnly: boolean;
  needsAnalysisOnly: boolean;
}

export const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  keys: new Set(),
  bpmMin: null,
  bpmMax: null,
  genres: new Set(),
  energyMin: null,
  ratingMin: null,
  unusedOnly: false,
  needsAnalysisOnly: false,
};

export interface IndexedTrack {
  track: Track;
  haystack: string;
}

export function indexTracks(tracks: Track[]): IndexedTrack[] {
  return tracks.map((track) => ({
    track,
    haystack: `${track.artist} ${track.title} ${track.label ?? ''} ${track.tags.join(' ')} ${track.album ?? ''}`.toLowerCase(),
  }));
}

export function filterTracks(index: IndexedTrack[], f: LibraryFilters, used: Set<string>): Track[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: Track[] = [];
  for (const { track, haystack } of index) {
    if (terms.length && !terms.every((t) => haystack.includes(t))) continue;
    if (f.keys.size && (!track.camelot || !f.keys.has(track.camelot))) continue;
    if (f.bpmMin !== null && (track.bpm === null || track.bpm < f.bpmMin)) continue;
    if (f.bpmMax !== null && (track.bpm === null || track.bpm > f.bpmMax)) continue;
    if (f.genres.size && (!track.genre || !f.genres.has(track.genre))) continue;
    if (f.energyMin !== null && (track.energy === null || track.energy < f.energyMin)) continue;
    if (f.ratingMin !== null && (track.rating === null || track.rating < f.ratingMin)) continue;
    if (f.unusedOnly && used.has(track.id)) continue;
    if (f.needsAnalysisOnly && !needsAnalysis(track)) continue;
    out.push(track);
  }
  return out;
}

export function isFiltering(f: LibraryFilters): boolean {
  return (
    f.query !== '' ||
    f.keys.size > 0 ||
    f.bpmMin !== null ||
    f.bpmMax !== null ||
    f.genres.size > 0 ||
    f.energyMin !== null ||
    f.ratingMin !== null ||
    f.unusedOnly ||
    f.needsAnalysisOnly
  );
}
