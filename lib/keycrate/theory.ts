/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · harmonic theory
   Every key is a tonic pitch class (0 = C … 11 = B) plus a mode. A move between two
   keys is read from pitch-class arithmetic mod 12, not from Camelot tables:

     Δ        = (tonicB − tonicA) mod 12            tonic interval in semitones
     fifths   = 7·Δ mod 12, wrapped to −6…+6         tonic steps round the circle of fifths
     sig(k)   = 7·(tonic + (minor ? 3 : 0)) mod 12   key signature, via the relative major
     D        = sig(B) − sig(A), wrapped to −6…+6    signature distance (+ = sharpward)

   Consonance comes from counting shared pitch classes: the two diatonic scales
   (7 − |D| for |D| ≤ 5) and the two tonic triads (0–3). Named relationships come from
   the Neo-Riemannian P/L/R group acting on the 24 triads: the shortest P/L/R word
   between the two tonic triads is found by breadth-first search. Pure functions,
   unit-tested in theory.test.ts.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { camelotLetter, camelotNumber } from './camelot';
import type { Camelot } from './types';

export type Mode = 'major' | 'minor';

export interface Key {
  /** Pitch class of the tonic, 0 = C … 11 = B. */
  tonic: number;
  mode: Mode;
}

export const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** Wraps an integer mod 12 onto the signed range −5…+6. */
export const signed12 = (n: number) => {
  const m = mod12(n);
  return m > 6 ? m - 12 : m;
};

const NOTE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/* ── Camelot ↔ pitch class ─────────────────────────────────────────────────── */

/**
 * Camelot 8B is C major and each step clockwise is a fifth up (+7 semitones), so the
 * major tonic of number n is 7·(n − 8) mod 12. Camelot nA is the relative minor, three
 * semitones below its major partner.
 */
export function keyOf(k: Camelot): Key {
  const majorTonic = mod12(7 * (camelotNumber(k) - 8));
  return camelotLetter(k) === 'B'
    ? { tonic: majorTonic, mode: 'major' }
    : { tonic: mod12(majorTonic - 3), mode: 'minor' };
}

export function camelotOf(key: Key): Camelot {
  const majorTonic = key.mode === 'major' ? key.tonic : mod12(key.tonic + 3);
  // Inverse of 7·(n − 8): 7 is its own inverse mod 12 (7·7 = 49 ≡ 1).
  const n = mod12(7 * majorTonic) + 8;
  return `${((n - 1) % 12) + 1}${key.mode === 'major' ? 'B' : 'A'}` as Camelot;
}

export const keyLabel = (k: Key) => `${NOTE[k.tonic]}${k.mode === 'minor' ? 'm' : ''}`;

/* ── Pitch-class sets ──────────────────────────────────────────────────────── */

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const bits = (pcs: number[]) => pcs.reduce((m, p) => m | (1 << mod12(p)), 0);
const popcount = (n: number) => {
  let c = 0;
  for (let x = n; x; x &= x - 1) c++;
  return c;
};

/** Key signature as fifths from C: +1 per sharp, −1 per flat (minor uses its relative major). */
export const signature = (k: Key) => signed12(7 * (k.mode === 'major' ? k.tonic : k.tonic + 3));

/** The seven notes of the key (natural minor for minor keys) as a 12-bit mask. */
export function scaleMask(k: Key): number {
  const root = k.mode === 'major' ? k.tonic : k.tonic + 3;
  return bits(MAJOR_SCALE.map((s) => root + s));
}

/** The tonic triad: root, third (4 for major, 3 for minor) and fifth. */
export function triadMask(k: Key): number {
  return bits([k.tonic, k.tonic + (k.mode === 'major' ? 4 : 3), k.tonic + 7]);
}

export const scaleCommonTones = (a: Key, b: Key) => popcount(scaleMask(a) & scaleMask(b));
export const triadCommonTones = (a: Key, b: Key) => popcount(triadMask(a) & triadMask(b));

/* ── Neo-Riemannian P, L, R ────────────────────────────────────────────────── */

export type NrOp = 'P' | 'L' | 'R';

/**
 * The three Neo-Riemannian involutions. Each keeps two tones of the triad and moves the
 * third by a step: P (parallel) C↔Cm, R (relative) C↔Am, L (leading-tone exchange) C↔Em.
 */
export function applyNr(op: NrOp, k: Key): Key {
  const maj = k.mode === 'major';
  const flip: Mode = maj ? 'minor' : 'major';
  if (op === 'P') return { tonic: k.tonic, mode: flip };
  if (op === 'R') return { tonic: mod12(k.tonic + (maj ? 9 : 3)), mode: flip };
  return { tonic: mod12(k.tonic + (maj ? 4 : 8)), mode: flip };
}

const keyId = (k: Key) => k.tonic + (k.mode === 'minor' ? 12 : 0);

/** Shortest P/L/R word (applied left to right) taking triad a to triad b; '' when equal. */
export function nrPath(a: Key, b: Key): string {
  const target = keyId(b);
  const seen = new Map<number, string>([[keyId(a), '']]);
  const queue: Key[] = [a];
  while (queue.length) {
    const k = queue.shift()!;
    const word = seen.get(keyId(k))!;
    if (keyId(k) === target) return word;
    for (const op of ['P', 'R', 'L'] as NrOp[]) {
      const n = applyNr(op, k);
      if (!seen.has(keyId(n))) {
        seen.set(keyId(n), word + op);
        queue.push(n);
      }
    }
  }
  return '';
}

/* ── Named moves ───────────────────────────────────────────────────────────── */

export type MoveId =
  | 'identity'
  | 'dominant'
  | 'subdominant'
  | 'whole-tone-up'
  | 'whole-tone-down'
  | 'semitone-up'
  | 'semitone-down'
  | 'mediant-up-major-third'
  | 'mediant-down-major-third'
  | 'mediant-up-minor-third'
  | 'mediant-down-minor-third'
  | 'tritone'
  | 'relative'
  | 'parallel'
  | 'leading-tone'
  | 'diagonal'
  | 'slide'
  | 'nebenverwandt'
  | 'hexatonic-pole'
  | 'double-mediant'
  | 'minor-dominant'
  | 'dorian-four'
  | 'neapolitan'
  | 'leading-note-minor'
  | 'remote';

interface MoveDef {
  id: MoveId;
  name: string;
}

const d = (id: MoveId, name: string): MoveDef => ({ id, name });

/** Same mode on both sides, indexed by Δ (tonic interval in semitones). */
const SAME_MODE: MoveDef[] = [
  d('identity', 'Same key'),
  d('semitone-up', 'Semitone lift'),
  d('whole-tone-up', 'Whole-tone lift'),
  d('mediant-up-minor-third', 'Chromatic mediant ↑m3'),
  d('mediant-up-major-third', 'Chromatic mediant ↑M3'),
  d('subdominant', 'Subdominant'),
  d('tritone', 'Tritone'),
  d('dominant', 'Dominant'),
  d('mediant-down-major-third', 'Chromatic mediant ↓M3'),
  d('mediant-down-minor-third', 'Chromatic mediant ↓m3'),
  d('whole-tone-down', 'Whole-tone drop'),
  d('semitone-down', 'Semitone drop'),
];

/** Major into minor, indexed by Δ. */
const MAJOR_TO_MINOR: MoveDef[] = [
  d('parallel', 'Parallel minor'),
  d('slide', 'Slide'),
  d('diagonal', 'Diagonal (ii)'),
  d('double-mediant', 'Double chromatic mediant'),
  d('leading-tone', 'Leading-tone exchange'),
  d('nebenverwandt', 'Minor subdominant (N)'),
  d('tritone', 'Tritone'),
  d('minor-dominant', 'Minor dominant'),
  d('hexatonic-pole', 'Hexatonic pole'),
  d('relative', 'Relative minor'),
  d('remote', 'Remote minor'),
  d('leading-note-minor', 'Leading-note minor'),
];

/** Minor into major, indexed by Δ. */
const MINOR_TO_MAJOR: MoveDef[] = [
  d('parallel', 'Parallel major (Picardy)'),
  d('neapolitan', 'Neapolitan'),
  d('remote', 'Remote major'),
  d('relative', 'Relative major'),
  d('hexatonic-pole', 'Hexatonic pole'),
  d('dorian-four', 'Dorian IV'),
  d('tritone', 'Tritone'),
  d('nebenverwandt', 'Major dominant (N)'),
  d('leading-tone', 'Leading-tone exchange'),
  d('double-mediant', 'Double chromatic mediant'),
  d('diagonal', 'Diagonal (♭VII)'),
  d('slide', 'Slide'),
];

export type MoodDirection = 'brighter' | 'darker' | 'level' | 'ambiguous';
export type MoodIntensity = 'none' | 'subtle' | 'moderate' | 'strong' | 'extreme';

export interface Mood {
  /** Short label for the UI, e.g. "Brighter · lift". */
  label: string;
  direction: MoodDirection;
  intensity: MoodIntensity;
}

export interface HarmonicMove {
  id: MoveId;
  name: string;
  from: Key;
  to: Key;
  /** Tonic interval, 0…11 semitones up. */
  interval: number;
  /** Tonic steps round the circle of fifths, 7·Δ mod 12 wrapped to −5…+6. */
  fifths: number;
  /** Key-signature distance, −5…+6 (+ = toward the sharp side, clockwise). */
  signatureShift: number;
  /** Shortest Neo-Riemannian P/L/R word between the tonic triads, applied left to right. */
  nr: string;
  /** Pitch classes the two diatonic scales share, 2…7. */
  scaleCommon: number;
  /** Pitch classes the two tonic triads share, 0…3. */
  triadCommon: number;
  /** 0 (identical) … 10 (tritone): how far the ear has to travel. */
  tension: number;
  /** 1 − tension / 10. */
  consonance: number;
  /**
   * Signed brightness change: the signature shift on the circle of fifths (a tritone, ±6,
   * counts as 0: it is as far sharp as flat) plus 1 for minor→major, −1 for major→minor.
   */
  brightness: number;
  mood: Mood;
  /** One-line maths, e.g. "L · tonic +4 st · +1 fifth · chord 2/3 · scale 6/7". */
  maths: string;
}

/** Roughness of the tonic interval by interval class 0…6 (unison … tritone). */
const IC_DISSONANCE = [0, 0.8, 0.6, 0.3, 0.3, 0.1, 1];

/** Tension 0…10 from shared scale notes (55%), shared chord tones (30%) and tonic roughness (15%). */
export function tensionScore(scaleCommon: number, triadCommon: number, interval: number): number {
  const ic = Math.min(mod12(interval), 12 - mod12(interval));
  const t =
    0.55 * Math.min(1, (7 - scaleCommon) / 5) +
    0.3 * ((3 - triadCommon) / 3) +
    0.15 * IC_DISSONANCE[ic];
  return Math.round(t * 100) / 10;
}

const MEDIANTS: MoveId[] = [
  'mediant-up-major-third',
  'mediant-down-major-third',
  'mediant-up-minor-third',
  'mediant-down-minor-third',
  'slide',
  'nebenverwandt',
  'hexatonic-pole',
  'double-mediant',
];

function intensityOf(brightness: number, tension: number): MoodIntensity {
  const x = Math.max(Math.abs(brightness) / 6, tension / 10);
  if (x === 0) return 'none';
  if (x < 0.25) return 'subtle';
  if (x < 0.5) return 'moderate';
  if (x < 0.8) return 'strong';
  return 'extreme';
}

function moodOf(id: MoveId, from: Key, to: Key, brightness: number, tension: number): Mood {
  const intensity = intensityOf(brightness, tension);
  const direction: MoodDirection =
    id === 'tritone'
      ? 'ambiguous'
      : brightness > 0
        ? 'brighter'
        : brightness < 0
          ? 'darker'
          : 'level';
  const tone = direction === 'brighter' ? 'brighter' : direction === 'darker' ? 'darker' : '';
  let label: string;
  if (id === 'identity') label = 'Steady · same colour';
  else if (id === 'tritone') label = 'Tension · maximum distance';
  else if (id === 'parallel')
    label = to.mode === 'major' ? 'Brighter · Picardy lift' : 'Darker · shadow falls';
  else if (id === 'semitone-up') label = 'Energy lift · gear change';
  else if (id === 'semitone-down') label = 'Energy drop · sink';
  else if (MEDIANTS.includes(id)) label = `Cinematic shift${tone ? ` · ${tone}` : ''}`;
  else if (direction === 'brighter')
    label = brightness >= 2 ? 'Brighter · lift' : 'Brighter · open';
  else if (direction === 'darker')
    label = brightness <= -2 ? 'Darker · release' : 'Darker · settle';
  else label = from.mode === to.mode ? 'Level · same colour' : 'Level · colour shift';
  return { label, direction, intensity };
}

/**
 * The textbook spelling of the three compound Neo-Riemannian moves (other equally short
 * words exist, e.g. Slide = LPR = RPL); every other move uses the BFS word.
 */
const CANONICAL_NR: Partial<Record<MoveId, string>> = {
  slide: 'LPR',
  nebenverwandt: 'RLP',
  'hexatonic-pole': 'PLP',
};

const NR_SYMBOL: Partial<Record<MoveId, string>> = {
  slide: 'S',
  nebenverwandt: 'N',
  'hexatonic-pole': 'H',
};

const sgn = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Everything the maths says about moving from key `a` into key `b`. */
export function analyzeKeys(a: Key, b: Key): HarmonicMove {
  const interval = mod12(b.tonic - a.tonic);
  const table =
    a.mode === b.mode ? SAME_MODE : a.mode === 'major' ? MAJOR_TO_MINOR : MINOR_TO_MAJOR;
  const { id, name } = table[interval];
  const fifths = signed12(7 * interval);
  const signatureShift = signed12(signature(b) - signature(a));
  const scaleCommon = scaleCommonTones(a, b);
  const triadCommon = triadCommonTones(a, b);
  const tension = tensionScore(scaleCommon, triadCommon, interval);
  const modeTerm = a.mode === b.mode ? 0 : b.mode === 'major' ? 1 : -1;
  const brightness = (Math.abs(signatureShift) === 6 ? 0 : signatureShift) + modeTerm;
  const nr = CANONICAL_NR[id] ?? nrPath(a, b);
  const sym = NR_SYMBOL[id];
  const lead = sym ? `${sym} = ${nr} · ` : nr && nr.length <= 3 ? `${nr} · ` : '';
  const maths =
    `${lead}tonic ${sgn(signed12(interval))} st` +
    ` · ${sgn(signatureShift)} fifth${Math.abs(signatureShift) === 1 ? '' : 's'}` +
    ` · chord ${triadCommon}/3 · scale ${scaleCommon}/7`;
  return {
    id,
    name,
    from: a,
    to: b,
    interval,
    fifths,
    signatureShift,
    nr,
    scaleCommon,
    triadCommon,
    tension,
    consonance: Math.round((1 - tension / 10) * 100) / 100,
    brightness,
    mood: moodOf(id, a, b, brightness, tension),
    maths,
  };
}

/** Camelot convenience wrapper; null when either key is missing. */
export function analyzeMove(from: Camelot | null, to: Camelot | null): HarmonicMove | null {
  return from && to ? analyzeKeys(keyOf(from), keyOf(to)) : null;
}

/** Mood line for the UI: "Brighter · lift ☀+2 · T3.9". */
export function moodSummary(m: HarmonicMove): string {
  return `${m.mood.label} · ☀${m.brightness > 0 ? '+' : ''}${m.brightness} · T${m.tension.toFixed(1)}`;
}
