/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · harmonic engine
   Classifies the move from one key to the next, works out how much pitch a tempo
   match costs and whether that shifts the key, and grades BPM compatibility.
   Pure functions, unit-tested in harmonic.test.ts.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { camelotLetter, camelotNumber, makeCamelot } from './camelot';
import { analyzeMove, type HarmonicMove, type MoveId } from './theory';
import type { Camelot, PlaylistSettings, Track } from './types';

export type { HarmonicMove } from './theory';

export type TransitionType =
  | 'same'
  | 'fifth'
  | 'relative'
  | 'parallel'
  | 'diagonal'
  | 'boost'
  | 'semitone'
  | 'third'
  | 'chromatic'
  | 'clash'
  | 'unknown';

export const SMOOTH_TYPES: TransitionType[] = ['same', 'fifth', 'relative', 'parallel', 'diagonal'];
export const DRAMATIC_TYPES: TransitionType[] = ['boost', 'semitone', 'third', 'chromatic'];

export const TRANSITION_LABEL: Record<TransitionType, string> = {
  same: 'Same key',
  fifth: 'Perfect 5th',
  relative: 'Relative',
  parallel: 'Parallel',
  diagonal: 'Diagonal',
  boost: 'Energy boost',
  semitone: 'Semitone lift',
  third: 'Third',
  chromatic: 'Chromatic',
  clash: 'Clash',
  unknown: 'No key',
};

export const TRANSITION_FEEL: Record<TransitionType, string> = {
  same: 'seamless',
  fifth: 'smooth, in tune',
  relative: 'mood flip',
  parallel: 'same root, mode flip',
  diagonal: 'gentle lift or drop',
  boost: 'noticeable lift',
  semitone: 'gear shift',
  third: 'dramatic but consonant',
  chromatic: 'cinematic, one shared tone',
  clash: 'out of key',
  unknown: 'untagged key',
};

/** Order the suggestion panel groups appear in. */
export const TRANSITION_ORDER: TransitionType[] = [
  'same',
  'fifth',
  'relative',
  'parallel',
  'diagonal',
  'boost',
  'semitone',
  'third',
  'chromatic',
  'clash',
  'unknown',
];

export const isSmooth = (t: TransitionType) => SMOOTH_TYPES.includes(t);
export const isDramatic = (t: TransitionType) => DRAMATIC_TYPES.includes(t);

/** Which transition family each named move belongs to; anything not listed clashes. */
const MOVE_TYPE: Partial<Record<MoveId, TransitionType>> = {
  identity: 'same',
  dominant: 'fifth',
  subdominant: 'fifth',
  relative: 'relative',
  parallel: 'parallel',
  'leading-tone': 'diagonal',
  diagonal: 'diagonal',
  'whole-tone-up': 'boost',
  'semitone-up': 'semitone',
  'mediant-up-major-third': 'third',
  'mediant-down-major-third': 'third',
  'mediant-up-minor-third': 'third',
  'mediant-down-minor-third': 'third',
  slide: 'chromatic',
  nebenverwandt: 'chromatic',
  'hexatonic-pole': 'chromatic',
};

export const typeOfMove = (m: HarmonicMove | null): TransitionType =>
  m ? (MOVE_TYPE[m.id] ?? 'clash') : 'unknown';

/**
 * Classifies the move from one Camelot key to the next, from pitch-class arithmetic
 * (see theory.ts) rather than wheel lookups.
 */
export function classifyKeys(from: Camelot | null, to: Camelot | null): TransitionType {
  return typeOfMove(analyzeMove(from, to));
}

/* ── Pitch ─────────────────────────────────────────────────────────────────── */

/** Pitch change beyond which a tempo match audibly shifts the key (without key lock). */
export const PITCH_SHIFT_THRESHOLD_PCT = 3;

/** Percent pitch change to play `bpm` at `targetBpm`: +6 means 6% faster. */
export function pitchPercent(bpm: number, targetBpm: number): number {
  return (targetBpm / bpm - 1) * 100;
}

/** How many semitones a pitch change moves the key: about 6% per semitone (12·log2 of the ratio). */
export function semitonesForPitch(percent: number): number {
  return 12 * Math.log2(1 + percent / 100);
}

/** Camelot key after shifting by whole semitones: each semitone up is +7 on the wheel, same letter. */
export function shiftKey(key: Camelot, semitones: number): Camelot {
  const n = Math.round(semitones);
  return makeCamelot(camelotNumber(key) + 7 * n, camelotLetter(key));
}

export interface PitchResult {
  /** Percent pitch change needed to tempo-match. */
  percent: number;
  /** Whole semitones the key drifts once the change passes the threshold; 0 with key lock. */
  semitones: number;
  /** The key the track will actually sound in at the new tempo. */
  effectiveKey: Camelot | null;
}

/**
 * Key a track sounds in once tempo-matched. With key lock the key never moves; without it,
 * anything past ±3% shifts by the nearest whole semitone.
 */
export function pitchedKey(
  key: Camelot | null,
  bpm: number | null,
  targetBpm: number | null,
  keyLock: boolean,
): PitchResult {
  if (!bpm || !targetBpm) return { percent: 0, semitones: 0, effectiveKey: key };
  const percent = pitchPercent(bpm, targetBpm);
  if (keyLock || Math.abs(percent) <= PITCH_SHIFT_THRESHOLD_PCT || !key) {
    return { percent, semitones: 0, effectiveKey: key };
  }
  const semitones = Math.round(semitonesForPitch(percent));
  return { percent, semitones, effectiveKey: semitones === 0 ? key : shiftKey(key, semitones) };
}

/* ── BPM ───────────────────────────────────────────────────────────────────── */

export type BpmMatchKind = 'direct' | 'half' | 'double';

export interface BpmMatch {
  kind: BpmMatchKind;
  /** Percent the candidate must be pitched to sit on the current tempo (after halving/doubling). */
  percent: number;
  /** The candidate's BPM once halved or doubled, i.e. what it is compared against. */
  effectiveBpm: number;
}

/**
 * Whether `candidate` can be mixed at `current` BPM within `tolerancePct`, directly or by
 * treating it as half-time (70↔140) or double-time (170↔85). Null when nothing fits.
 */
export function matchBpm(
  current: number | null,
  candidate: number | null,
  tolerancePct: number,
): BpmMatch | null {
  if (!current || !candidate) return null;
  const tries: Array<[BpmMatchKind, number]> = [
    ['direct', candidate],
    ['half', candidate * 2],
    ['double', candidate / 2],
  ];
  // With wide tolerances (up to 40%) more than one reading can fit: take the smallest pitch change.
  let best: BpmMatch | null = null;
  for (const [kind, effectiveBpm] of tries) {
    const percent = pitchPercent(effectiveBpm, current);
    if (Math.abs(percent) <= tolerancePct && (!best || Math.abs(percent) < Math.abs(best.percent)))
      best = { kind, percent, effectiveBpm };
  }
  return best;
}

/* ── Whole transition ──────────────────────────────────────────────────────── */

export interface Transition {
  type: TransitionType;
  /** The named harmonic move with its maths and mood, on the pitched (effective) key. */
  move: HarmonicMove | null;
  fromKey: Camelot | null;
  toKey: Camelot | null;
  /** Key the incoming track sounds in after tempo matching. */
  effectiveToKey: Camelot | null;
  semitoneShift: number;
  bpm: BpmMatch | null;
  /** Raw BPM change in percent, incoming over outgoing, even when out of range. */
  bpmChangePct: number | null;
  dramatic: boolean;
  clash: boolean;
  reason: string;
}

const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(p % 1 === 0 ? 0 : 1)}%`;

/** Everything the UI needs to describe moving from `from` into `to`. */
export function classifyTransition(from: Track, to: Track, settings: PlaylistSettings): Transition {
  const bpm = matchBpm(from.bpm, to.bpm, settings.bpmTolerance);
  const bpmChangePct = from.bpm && to.bpm ? pitchPercent(from.bpm, to.bpm) : null;
  // Tempo-match against the halved/doubled BPM when that is how the track will be played.
  const pitch = pitchedKey(to.camelot, bpm ? bpm.effectiveBpm : to.bpm, from.bpm, settings.keyLock);
  const move = analyzeMove(from.camelot, pitch.effectiveKey);
  const type = typeOfMove(move);

  const parts: string[] = [TRANSITION_LABEL[type]];
  if (pitch.semitones !== 0)
    parts.push(`${pitch.semitones > 0 ? '+' : ''}${pitch.semitones} st pitched`);
  if (bpm) {
    parts.push(
      bpm.kind === 'direct'
        ? `${fmtPct(bpm.percent)} BPM`
        : `${bpm.kind}-time, ${fmtPct(bpm.percent)}`,
    );
  } else if (bpmChangePct !== null) {
    parts.push(`${fmtPct(bpmChangePct)} BPM, out of range`);
  } else {
    parts.push('no BPM');
  }

  return {
    type,
    move,
    fromKey: from.camelot,
    toKey: to.camelot,
    effectiveToKey: pitch.effectiveKey,
    semitoneShift: pitch.semitones,
    bpm,
    bpmChangePct,
    dramatic: isDramatic(type),
    clash: type === 'clash',
    reason: parts.join(', '),
  };
}

/** Transitions between consecutive tracks of a set. */
export function setTransitions(tracks: Track[], settings: PlaylistSettings): Transition[] {
  const out: Transition[] = [];
  for (let i = 1; i < tracks.length; i++)
    out.push(classifyTransition(tracks[i - 1], tracks[i], settings));
  return out;
}
