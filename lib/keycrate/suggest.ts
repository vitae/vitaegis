/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · next-track suggestions
   Ranks the library against the last track in the set under the three build modes:
   Smooth (harmonic moves only), Dramatic (one big move per N tracks) and Journey
   (fit to a drawn energy and BPM curve).
   ═══════════════════════════════════════════════════════════════════════════════ */

import {
  classifyTransition,
  isDramatic,
  isSmooth,
  setTransitions,
  type Transition,
  type TransitionType,
} from './harmonic';
import type { JourneyCurve, PlaylistSettings, Track } from './types';

export interface Suggestion {
  track: Track;
  transition: Transition;
  score: number;
  reason: string;
}

const TYPE_WEIGHT: Record<TransitionType, number> = {
  same: 1,
  fifth: 0.95,
  relative: 0.9,
  diagonal: 0.85,
  boost: 0.7,
  semitone: 0.65,
  third: 0.6,
  clash: 0,
  unknown: 0.1,
};

/** Linear interpolation of a control-point curve at t in 0…1. */
export function sampleCurve(points: number[], t: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0];
  const x = Math.min(1, Math.max(0, t)) * (points.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  return i >= points.length - 1
    ? points[points.length - 1]
    : points[i] * (1 - f) + points[i + 1] * f;
}

/** Target energy and BPM for the track at `position` in a journey. */
export function journeyTarget(
  curve: JourneyCurve,
  position: number,
): { energy: number; bpm: number } {
  const t = curve.length <= 1 ? 0 : position / (curve.length - 1);
  return { energy: sampleCurve(curve.energy, t), bpm: sampleCurve(curve.bpm, t) };
}

/** Whether a dramatic move is allowed now: none in the last (dramaticEvery − 1) transitions. */
export function dramaticAllowed(transitions: Transition[], every: number): boolean {
  const window = Math.max(1, every) - 1;
  const recent = transitions.slice(-window);
  return !recent.some((t) => t.dramatic);
}

export interface SuggestOptions {
  limit?: number;
  /** Tracks to leave out, e.g. everything already in the set. */
  exclude?: Set<string>;
}

/**
 * Top suggestions for what to play after `set`. Empty set → nothing to rank against, so the
 * caller shows the library instead.
 */
export function suggestNext(
  set: Track[],
  library: Track[],
  settings: PlaylistSettings,
  opts: SuggestOptions = {},
): Suggestion[] {
  const last = set[set.length - 1];
  if (!last) return [];
  const limit = opts.limit ?? 10;
  const exclude = opts.exclude ?? new Set(set.map((t) => t.id));
  const previous = setTransitions(set, settings);
  const allowDramatic =
    settings.mode !== 'smooth' && dramaticAllowed(previous, settings.dramaticEvery);
  const target =
    settings.mode === 'journey' && settings.journey
      ? journeyTarget(settings.journey, set.length)
      : null;

  const out: Suggestion[] = [];
  for (const track of library) {
    if (exclude.has(track.id) || track.id === last.id) continue;
    const transition = classifyTransition(last, track, settings);
    if (transition.type === 'clash') continue;
    if (settings.mode === 'smooth' && !isSmooth(transition.type)) continue;
    if (isDramatic(transition.type) && !allowDramatic) continue;
    if (!transition.bpm) continue;

    let score = TYPE_WEIGHT[transition.type];
    // Closer tempo wins inside the tolerance; half/double-time matches sit slightly lower.
    score += 0.3 * (1 - Math.abs(transition.bpm.percent) / Math.max(settings.bpmTolerance, 0.01));
    if (transition.bpm.kind !== 'direct') score -= 0.1;
    if (transition.semitoneShift !== 0) score -= 0.15;

    let reason = transition.reason;
    if (target) {
      const energy = track.energy ?? 5;
      const eGap = Math.abs(energy - target.energy);
      const bGap = track.bpm ? Math.abs(track.bpm - target.bpm) / Math.max(target.bpm, 1) : 0.2;
      score += 0.6 * (1 - Math.min(eGap, 5) / 5) + 0.6 * (1 - Math.min(bGap, 0.2) / 0.2);
      reason += `, energy ${energy} vs ${target.energy.toFixed(0)}, target ${target.bpm.toFixed(0)} BPM`;
    }
    out.push({ track, transition, score, reason });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

/** Suggestions grouped by transition type, keeping rank order within each group. */
export function groupSuggestions(list: Suggestion[]): Map<TransitionType, Suggestion[]> {
  const map = new Map<TransitionType, Suggestion[]>();
  for (const s of list) {
    const arr = map.get(s.transition.type) ?? [];
    arr.push(s);
    map.set(s.transition.type, arr);
  }
  return map;
}

/**
 * Builds a whole set greedily from a library so it follows `curve`: at each step the best
 * suggestion for the next curve point is appended. Used by "Build similar from my crate".
 */
export function buildFromCurve(
  library: Track[],
  curve: JourneyCurve,
  settings: PlaylistSettings,
  seed?: Track,
): Track[] {
  const journey: PlaylistSettings = { ...settings, mode: 'journey', journey: curve };
  const target0 = journeyTarget(curve, 0);
  const first =
    seed ??
    [...library]
      .filter((t) => t.bpm && t.camelot)
      .sort((a, b) => {
        const fa =
          Math.abs((a.bpm ?? 0) - target0.bpm) + Math.abs((a.energy ?? 5) - target0.energy) * 4;
        const fb =
          Math.abs((b.bpm ?? 0) - target0.bpm) + Math.abs((b.energy ?? 5) - target0.energy) * 4;
        return fa - fb;
      })[0];
  if (!first) return [];
  const set: Track[] = [first];
  while (set.length < curve.length) {
    const next = suggestNext(set, library, journey, { limit: 1 })[0];
    if (!next) break;
    set.push(next.track);
  }
  return set;
}
