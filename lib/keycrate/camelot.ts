/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · key normalization
   Every key format the wild throws at us ("Am", "A min", "A minor", "8A", Open Key
   "1m", "D#m", "Ebm", "Fmaj", "F# Major") lands on one of the 24 Camelot keys.
   ═══════════════════════════════════════════════════════════════════════════════ */

import type { Camelot } from './types';

/** Wheel order used everywhere: 1A, 2A … 12A then 1B … 12B. */
export const CAMELOT_KEYS: Camelot[] = [
  ...Array.from({ length: 12 }, (_, i) => `${i + 1}A` as Camelot),
  ...Array.from({ length: 12 }, (_, i) => `${i + 1}B` as Camelot),
];

/** Musical name shown next to each Camelot key. */
export const KEY_NAMES: Record<Camelot, string> = {
  '1A': 'Ab minor',
  '2A': 'Eb minor',
  '3A': 'Bb minor',
  '4A': 'F minor',
  '5A': 'C minor',
  '6A': 'G minor',
  '7A': 'D minor',
  '8A': 'A minor',
  '9A': 'E minor',
  '10A': 'B minor',
  '11A': 'F# minor',
  '12A': 'Db minor',
  '1B': 'B major',
  '2B': 'F# major',
  '3B': 'Db major',
  '4B': 'Ab major',
  '5B': 'Eb major',
  '6B': 'Bb major',
  '7B': 'F major',
  '8B': 'C major',
  '9B': 'G major',
  '10B': 'D major',
  '11B': 'A major',
  '12B': 'E major',
};

/** Pitch class (0 = C) of each note name, sharps and flats included. */
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  FB: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
  CB: 11,
};

/** Camelot number of each minor root, by pitch class (Ab minor = 1A … Db minor = 12A). */
const MINOR_NUMBER: number[] = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
/** Camelot number of each major root, by pitch class (B major = 1B … E major = 12B). */
const MAJOR_NUMBER: number[] = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];

const MINOR_WORDS = /^(m|min|minor|mi|moll)$/;
const MAJOR_WORDS = /^(maj|major|ma|dur)?$/;

export function isCamelot(value: unknown): value is Camelot {
  return typeof value === 'string' && /^([1-9]|1[0-2])[AB]$/.test(value);
}

/**
 * Turns any key spelling into a Camelot key, or null when it isn't a key.
 * Handles Camelot ("8A", "08a"), Open Key ("1m" / "1d"), and musical names with
 * sharps, flats, unicode accidentals and any of the usual minor/major words.
 */
export function normalizeKey(value: unknown): Camelot | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, ' ');

  // Camelot: 8A, 08a, 12 B
  const cam = s.match(/^0*([1-9]|1[0-2]) ?([abAB])$/);
  if (cam) return `${Number(cam[1])}${cam[2].toUpperCase()}` as Camelot;

  // Open Key: 1m … 12m minor, 1d … 12d major. Open Key 1m is A minor, Camelot 8A.
  const open = s.match(/^0*([1-9]|1[0-2]) ?([mdMD])$/);
  if (open) {
    const n = ((Number(open[1]) + 6) % 12) + 1;
    return `${n}${open[2].toLowerCase() === 'm' ? 'A' : 'B'}` as Camelot;
  }

  // Musical: A, Am, A min, A minor, D#m, Ebm, F# Major, Bbmaj
  const mus = s.match(/^([A-Ga-g])([#b]?)\s?(.*)$/);
  if (!mus) return null;
  const root = (mus[1].toUpperCase() + (mus[2] || '')).toUpperCase();
  const pc = PITCH_CLASS[root];
  if (pc === undefined) return null;
  const quality = mus[3].trim().toLowerCase();
  if (MINOR_WORDS.test(quality)) return `${MINOR_NUMBER[pc]}A` as Camelot;
  if (MAJOR_WORDS.test(quality)) return `${MAJOR_NUMBER[pc]}B` as Camelot;
  return null;
}

export function camelotNumber(k: Camelot): number {
  return Number(k.slice(0, -1));
}

export function camelotLetter(k: Camelot): 'A' | 'B' {
  return k.slice(-1) as 'A' | 'B';
}

export function makeCamelot(n: number, letter: 'A' | 'B'): Camelot {
  return `${wrapNumber(n)}${letter}` as Camelot;
}

/** Wraps any integer onto 1–12. */
export function wrapNumber(n: number): number {
  return ((((n - 1) % 12) + 12) % 12) + 1;
}

/** Signed distance around the wheel from a to b, in -6…+6 steps. */
export function wheelDistance(a: number, b: number): number {
  const d = (((b - a) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}

export function keyName(k: Camelot | null | undefined): string {
  return k ? KEY_NAMES[k] : 'no key';
}

export const isMinor = (k: Camelot) => camelotLetter(k) === 'A';
