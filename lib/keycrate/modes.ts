/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · set-type build modes (Downtempo, Uptempo, Ambient)
   Profiles tuned on a study of 36 Tipper live sets (2022–2025): tempo pockets,
   energy bands by set type, how often the mood shifts and how long a track plays
   before the next comes in. Pure data and helpers, unit-tested in modes.test.ts.
   ═══════════════════════════════════════════════════════════════════════════════ */

import type { TransitionType } from './harmonic';
import type { BuildMode, Track } from './types';

export type ProfileMode = 'downtempo' | 'uptempo' | 'ambient';

export interface ModeProfile {
  /** Preferred tempo pocket in BPM; half- and double-time readings fold into it. */
  bpm: [number, number];
  /** Target energy band, 0…1. */
  energy: [number, number];
  /** At most one mood shift (a `rationed` move) per this many tracks. */
  shiftEvery: number;
  /** Moves that count as a mood shift and are rationed. */
  rationed: TransitionType[];
  /** Harmonic preference per move family, 0…1; families left out are not suggested. */
  weight: Partial<Record<TransitionType, number>>;
  /** Share of the harmonic score taken by raw consonance (the rest is `weight`). */
  consonanceShare: number;
  /** Weight of tempo closeness inside the tolerance. */
  tempoWeight: number;
  /** Bonus for a small upward tempo step (3–8% band), the "tempo creep". */
  upwardBonus: number;
  /** Penalty per brightness step beyond ±1, to keep the colour drifting slowly. */
  brightnessDrag: number;
  /** Tolerance floor in percent: Ambient barely cares about tempo. */
  minTolerance: number;
  /** When true a track with no BPM is still suggested (beatless material). */
  allowMissingBpm: boolean;
  /** Typical time a track plays before the next comes in, seconds (informational). */
  changeEverySeconds: number;
}

export const MODE_PROFILES: Record<ProfileMode, ModeProfile> = {
  downtempo: {
    bpm: [70, 100],
    energy: [0.3, 0.5],
    shiftEvery: 15,
    rationed: ['third', 'chromatic', 'boost', 'semitone'],
    weight: {
      same: 0.9,
      relative: 1,
      fifth: 0.9,
      parallel: 0.7,
      diagonal: 0.6,
      third: 0.75,
      chromatic: 0.6,
      boost: 0.4,
      semitone: 0.4,
    },
    consonanceShare: 0.3,
    tempoWeight: 0.35,
    upwardBonus: 0,
    brightnessDrag: 0,
    minTolerance: 0,
    allowMissingBpm: false,
    changeEverySeconds: 202,
  },
  uptempo: {
    bpm: [128, 150],
    energy: [0.7, 0.9],
    shiftEvery: 30,
    rationed: ['third', 'chromatic'],
    weight: {
      fifth: 1,
      semitone: 0.95,
      boost: 0.95,
      same: 0.75,
      relative: 0.7,
      diagonal: 0.6,
      parallel: 0.5,
      third: 0.5,
      chromatic: 0.45,
    },
    consonanceShare: 0.15,
    tempoWeight: 0.3,
    upwardBonus: 0.15,
    brightnessDrag: 0,
    minTolerance: 0,
    allowMissingBpm: false,
    changeEverySeconds: 86,
  },
  ambient: {
    bpm: [60, 100],
    energy: [0.1, 0.35],
    shiftEvery: 36,
    rationed: ['third', 'boost'],
    weight: {
      same: 1,
      relative: 1,
      parallel: 0.9,
      fifth: 0.85,
      diagonal: 0.7,
      third: 0.55,
      boost: 0.35,
    },
    consonanceShare: 0.5,
    tempoWeight: 0.05,
    upwardBonus: 0,
    brightnessDrag: 0.08,
    minTolerance: 40,
    allowMissingBpm: true,
    changeEverySeconds: 226,
  },
};

export const isProfileMode = (m: BuildMode): m is ProfileMode => m in MODE_PROFILES;

export const MODE_LABEL: Record<BuildMode, string> = {
  smooth: 'Smooth',
  dramatic: 'Dramatic',
  journey: 'Journey',
  downtempo: 'Downtempo',
  uptempo: 'Uptempo',
  ambient: 'Ambient',
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Energy 0…1: the user's 1–10 tag when set, else a tempo proxy (60 BPM ≈ 0, 170 ≈ 1).
 * Null without either.
 */
export function trackEnergy(t: Track): number | null {
  if (t.energy !== null && t.energy !== undefined) return clamp01(t.energy / 10);
  if (t.bpm) return clamp01((t.bpm - 60) / 110);
  return null;
}

/** 1 inside [lo, hi], falling linearly to 0 at `span` outside. */
export function bandFit(x: number, [lo, hi]: [number, number], span: number): number {
  const gap = x < lo ? lo - x : x > hi ? x - hi : 0;
  return clamp01(1 - gap / span);
}

/**
 * How well a tempo sits in the pocket, reading it as written, half-time or double-time
 * and taking the best; the gap is measured in percent of the pocket edge (0 at 25% out).
 */
export function tempoPocketFit(bpm: number | null, [lo, hi]: [number, number]): number {
  if (!bpm) return 0.5;
  let best = 0;
  for (const b of [bpm, bpm / 2, bpm * 2]) {
    const gap = b < lo ? (lo - b) / lo : b > hi ? (b - hi) / hi : 0;
    best = Math.max(best, clamp01(1 - gap / 0.25));
  }
  return best;
}
