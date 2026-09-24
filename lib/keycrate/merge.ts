/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · re-import merging
   Incoming tracks replace the imported fields of existing rows with the same
   identity (TrackID, else artist+title+duration) and keep everything the user
   added by hand: energy, tags, and any playlist that references the row.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { fallbackSourceId } from './csv';
import type { Track } from './types';

export interface MergeResult {
  tracks: Track[];
  added: number;
  updated: number;
  /** Ids of incoming tracks mapped to the existing id they merged into. */
  remapped: Map<string, string>;
}

const fingerprint = (t: Track) => fallbackSourceId(t.artist, t.title, t.durationS);

export function mergeTracks(existing: Track[], incoming: Track[]): MergeResult {
  const byId = new Map(existing.map((t) => [t.id, t]));
  const byFingerprint = new Map(existing.map((t) => [fingerprint(t), t]));
  const remapped = new Map<string, string>();
  let added = 0;
  let updated = 0;
  for (const t of incoming) {
    const match = byId.get(t.id) ?? byFingerprint.get(fingerprint(t));
    if (match) {
      const merged: Track = {
        ...match,
        ...t,
        id: match.id,
        energy: match.energy ?? t.energy,
        tags: match.tags.length ? match.tags : t.tags,
        rating: t.rating ?? match.rating,
      };
      byId.set(match.id, merged);
      byFingerprint.set(fingerprint(merged), merged);
      if (t.id !== match.id) remapped.set(t.id, match.id);
      updated++;
    } else {
      byId.set(t.id, t);
      byFingerprint.set(fingerprint(t), t);
      added++;
    }
  }
  return { tracks: Array.from(byId.values()), added, updated, remapped };
}

/** Tracks that still need rekordbox analysis: no key or no usable BPM. */
export const needsAnalysis = (t: Track) => !t.camelot || !t.bpm;
