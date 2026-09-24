/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · shared types
   Plain data shared by the importer, the harmonic engine, storage and the UI.
   ═══════════════════════════════════════════════════════════════════════════════ */

/** A Camelot key, "1A" through "12B". */
export type Camelot = `${number}${'A' | 'B'}`;

export interface HotCue {
  name: string;
  /** Seconds from the start of the file. */
  start: number;
  /** rekordbox cue number; -1 for memory cues. */
  num: number;
}

export interface TempoMark {
  /** Seconds from the start of the file. */
  at: number;
  bpm: number;
}

export interface Track {
  /** Local identity: `rb:<TrackID>` for rekordbox, `csv:<hash>` for CSV rows. */
  id: string;
  /** rekordbox TrackID or a stable hash of artist+title+duration. Cloud rows key on it too. */
  sourceId: string;
  artist: string;
  title: string;
  album?: string;
  camelot: Camelot | null;
  /** Raw key as it appeared in the import, kept so unknown formats can be inspected. */
  keyRaw?: string;
  bpm: number | null;
  durationS: number | null;
  genre?: string;
  label?: string;
  /** 1–10; null until the user rates it. */
  energy: number | null;
  /** 0–5 stars. */
  rating: number | null;
  tags: string[];
  comments?: string;
  location?: string;
  addedAt?: string;
  tempo?: TempoMark[];
  cues?: HotCue[];
}

export type BuildMode = 'smooth' | 'dramatic' | 'journey';

export interface JourneyCurve {
  /** Energy 1–10 per control point, spread evenly across the planned set. */
  energy: number[];
  /** Target BPM per control point, spread evenly across the planned set. */
  bpm: number[];
  /** Planned number of tracks in the set. */
  length: number;
}

export interface PlaylistSettings {
  mode: BuildMode;
  /** Dramatic mode: at most one dramatic move per this many tracks. */
  dramaticEvery: number;
  /** BPM tolerance in percent. */
  bpmTolerance: number;
  /** Master Tempo on: pitch changes never shift the key. */
  keyLock: boolean;
  journey?: JourneyCurve;
}

export interface PlaylistItem {
  trackId: string;
  note?: string;
}

export interface Playlist {
  id: string;
  name: string;
  settings: PlaylistSettings;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
  /** Cloud id once saved; absent for local-only playlists. */
  cloudId?: string;
  isPublic?: boolean;
}

export interface SetStudy {
  id: string;
  title: string;
  sourceText: string;
  createdAt: string;
}

export const DEFAULT_SETTINGS: PlaylistSettings = {
  mode: 'smooth',
  dramaticEvery: 4,
  bpmTolerance: 6,
  keyLock: false,
};
