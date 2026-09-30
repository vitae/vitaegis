import { describe, expect, it } from 'vitest';
import { CAMELOT_KEYS } from './camelot';
import { classifyKeys, classifyTransition } from './harmonic';
import {
  analyzeKeys,
  analyzeMove,
  applyNr,
  camelotOf,
  keyOf,
  nrPath,
  scaleCommonTones,
  signature,
  triadCommonTones,
  type Key,
} from './theory';
import { DEFAULT_SETTINGS, type Camelot, type Track } from './types';

const C: Key = { tonic: 0, mode: 'major' };
const Am: Key = { tonic: 9, mode: 'minor' };
const key = (tonic: number, mode: 'major' | 'minor' = 'major'): Key => ({ tonic, mode });
const move = (a: Camelot, b: Camelot) => analyzeMove(a, b)!;

describe('keys as pitch class + mode', () => {
  it('reads Camelot as tonic and mode', () => {
    expect(keyOf('8B')).toEqual(C);
    expect(keyOf('8A')).toEqual(Am);
    expect(keyOf('9B')).toEqual(key(7)); // G
    expect(keyOf('11B')).toEqual(key(9)); // A major
    expect(keyOf('1A')).toEqual(key(8, 'minor')); // Ab minor
    expect(keyOf('12B')).toEqual(key(4)); // E major
  });
  it('round-trips all 24 keys', () => {
    for (const k of CAMELOT_KEYS) expect(camelotOf(keyOf(k))).toBe(k);
  });
  it('key signature in fifths via the relative major', () => {
    expect(signature(C)).toBe(0);
    expect(signature(Am)).toBe(0);
    expect(signature(key(7))).toBe(1); // G: 1 sharp
    expect(signature(key(5))).toBe(-1); // F: 1 flat
    expect(signature(key(0, 'minor'))).toBe(-3); // Cm: 3 flats
    expect(signature(key(9))).toBe(3); // A: 3 sharps
  });
});

describe('common tones', () => {
  it('scales share 7 − |fifths| notes up to 5 fifths, 2 at the tritone', () => {
    const expected = [7, 6, 5, 4, 3, 2, 2];
    for (let k = 0; k <= 6; k++) {
      // k fifths clockwise from C is tonic 7k mod 12.
      expect(scaleCommonTones(C, key((7 * k) % 12))).toBe(expected[k]);
    }
    expect(scaleCommonTones(C, Am)).toBe(7);
  });
  it('tonic triads share 0–3 tones', () => {
    expect(triadCommonTones(C, C)).toBe(3);
    expect(triadCommonTones(C, Am)).toBe(2); // C E
    expect(triadCommonTones(C, key(4, 'minor'))).toBe(2); // Em: E G
    expect(triadCommonTones(C, key(0, 'minor'))).toBe(2); // Cm: C G
    expect(triadCommonTones(C, key(7))).toBe(1); // G
    expect(triadCommonTones(C, key(4))).toBe(1); // E major: E
    expect(triadCommonTones(C, key(6))).toBe(0); // F#
    expect(triadCommonTones(C, key(8, 'minor'))).toBe(0); // Abm, hexatonic pole
  });
});

describe('Neo-Riemannian P, L, R on C major', () => {
  it('P, R and L each keep two tones and swap mode', () => {
    expect(applyNr('P', C)).toEqual(key(0, 'minor'));
    expect(applyNr('R', C)).toEqual(Am);
    expect(applyNr('L', C)).toEqual(key(4, 'minor'));
    for (const op of ['P', 'L', 'R'] as const) {
      expect(triadCommonTones(C, applyNr(op, C))).toBe(2);
      expect(applyNr(op, applyNr(op, C))).toEqual(C); // involutions
    }
  });
  it('finds the shortest P/L/R word', () => {
    expect(nrPath(C, C)).toBe('');
    expect(nrPath(C, key(0, 'minor'))).toBe('P');
    expect(nrPath(C, key(8))).toBe('PL'); // C → Cm → Ab
    expect(nrPath(C, key(3))).toBe('PR'); // C → Cm → Eb
    expect(nrPath(C, key(4))).toBe('LP'); // C → Em → E
    expect(nrPath(C, key(9))).toBe('RP'); // C → Am → A
    expect(nrPath(C, key(7))).toBe('LR'); // dominant
    expect(nrPath(C, key(5))).toBe('RL'); // subdominant
  });
  it('hexatonic (PL) and octatonic (PR) cycles close after 6 and 8 triads', () => {
    let k = C;
    const hex: Key[] = [];
    for (let i = 0; i < 6; i++) {
      hex.push(k);
      k = applyNr(i % 2 === 0 ? 'P' : 'L', k);
    }
    expect(k).toEqual(C);
    expect(new Set(hex.map((x) => `${x.tonic}${x.mode}`)).size).toBe(6);
    k = C;
    for (let i = 0; i < 8; i++) k = applyNr(i % 2 === 0 ? 'P' : 'R', k);
    expect(k).toEqual(C);
  });
});

describe('named moves', () => {
  it('8A → 8B is the relative (R): all 7 notes, 2 chord tones, brighter', () => {
    const m = move('8A', '8B');
    expect(m).toMatchObject({ id: 'relative', nr: 'R', scaleCommon: 7, triadCommon: 2 });
    expect(m.brightness).toBe(1);
    expect(m.mood.direction).toBe('brighter');
  });
  it('8A → 11B is the parallel (P): A minor → A major, a Picardy lift', () => {
    const m = move('8A', '11B');
    expect(m).toMatchObject({ id: 'parallel', nr: 'P', interval: 0, triadCommon: 2 });
    expect(m.scaleCommon).toBe(4);
    expect(m.signatureShift).toBe(3);
    expect(m.brightness).toBe(4);
    expect(m.mood.label).toContain('Picardy');
    expect(move('11B', '8A').brightness).toBe(-4);
    expect(classifyKeys('8A', '11B')).toBe('parallel');
    expect(classifyKeys('8B', '5A')).toBe('parallel'); // C → Cm
  });
  it('8A → 9A is the dominant: +1 fifth, 6 of 7 notes, brighter; back is darker', () => {
    const m = move('8A', '9A');
    expect(m).toMatchObject({ id: 'dominant', fifths: 1, signatureShift: 1, scaleCommon: 6 });
    expect(m.triadCommon).toBe(1);
    expect(m.brightness).toBe(1);
    const back = move('9A', '8A');
    expect(back.id).toBe('subdominant');
    expect(back.brightness).toBe(-1);
    expect(back.mood.direction).toBe('darker');
  });
  it('C major → E major is a chromatic mediant: one shared tone, cinematic', () => {
    const m = analyzeKeys(C, key(4));
    expect(m).toMatchObject({ id: 'mediant-up-major-third', triadCommon: 1, nr: 'LP' });
    expect(m.mood.label).toMatch(/^Cinematic shift/);
    expect(m.brightness).toBeGreaterThan(0);
    expect(analyzeKeys(C, key(8)).brightness).toBeLessThan(0); // C → Ab darker
    expect(classifyKeys('8B', '12B')).toBe('third');
  });
  it('C → F# is the tritone: maximum tension, direction ambiguous', () => {
    const m = analyzeKeys(C, key(6));
    expect(m).toMatchObject({ id: 'tritone', scaleCommon: 2, triadCommon: 0, tension: 10 });
    expect(m.brightness).toBe(0);
    expect(m.mood.direction).toBe('ambiguous');
    expect(m.mood.label).toMatch(/^Tension/);
    // Nothing else reaches the tritone's tension.
    for (let t = 0; t < 12; t++)
      for (const mode of ['major', 'minor'] as const) {
        const other = analyzeKeys(C, { tonic: t, mode });
        if (other.id !== 'tritone') expect(other.tension).toBeLessThan(10);
      }
  });
  it('L on C major is E minor: 2 of 3 chord tones, 6 of 7 notes', () => {
    const m = analyzeKeys(C, key(4, 'minor'));
    expect(m).toMatchObject({ id: 'leading-tone', nr: 'L', triadCommon: 2, scaleCommon: 6 });
    expect(m.maths).toBe('L · tonic +4 st · +1 fifth · chord 2/3 · scale 6/7');
    expect(classifyKeys('8B', '9A')).toBe('diagonal');
  });
  it('Slide, Nebenverwandt and hexatonic pole are chromatic moves', () => {
    expect(analyzeKeys(C, key(1, 'minor'))).toMatchObject({
      id: 'slide',
      nr: 'LPR',
      triadCommon: 1,
    });
    expect(analyzeKeys(C, key(5, 'minor'))).toMatchObject({ id: 'nebenverwandt', nr: 'RLP' });
    expect(analyzeKeys(C, key(8, 'minor'))).toMatchObject({
      id: 'hexatonic-pole',
      nr: 'PLP',
      triadCommon: 0,
    });
    expect(classifyKeys('8B', '12A')).toBe('chromatic');
    expect(classifyKeys('8B', '1A')).toBe('chromatic');
  });
  it('semitone and whole-tone lifts', () => {
    expect(move('8A', '3A').id).toBe('semitone-up');
    expect(move('8A', '3A').mood.label).toMatch(/^Energy lift/);
    expect(move('8A', '10A')).toMatchObject({ id: 'whole-tone-up', brightness: 2 });
    expect(move('8A', '6A')).toMatchObject({ id: 'whole-tone-down', brightness: -2 });
  });
  it('brightness is sharpward shift plus one for minor → major', () => {
    expect(move('8B', '9B').brightness).toBe(1); // C → G
    expect(move('8B', '7B').brightness).toBe(-1); // C → F
    expect(move('8B', '8A').brightness).toBe(-1); // C → Am
    expect(move('8B', '8B').brightness).toBe(0);
    expect(move('8B', '8B').tension).toBe(0);
    expect(move('8B', '8B').mood.intensity).toBe('none');
  });
  it('is antisymmetric in brightness and symmetric in common tones', () => {
    for (const a of CAMELOT_KEYS)
      for (const b of CAMELOT_KEYS) {
        const ab = move(a, b);
        const ba = move(b, a);
        expect(ab.brightness + ba.brightness).toBe(0);
        expect(ab.scaleCommon).toBe(ba.scaleCommon);
        expect(ab.triadCommon).toBe(ba.triadCommon);
        expect(ab.tension).toBe(ba.tension);
      }
  });
  it('tension ranks relative < L < fifth < parallel < chromatic mediant < tritone', () => {
    const t = (b: Key) => analyzeKeys(C, b).tension;
    const order = [Am, key(4, 'minor'), key(7), key(0, 'minor'), key(4), key(6)].map(t);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('transitions carry the move on the pitched key', () => {
  const track = (camelot: Camelot, bpm: number): Track => ({
    id: camelot,
    sourceId: camelot,
    artist: 'a',
    title: 't',
    camelot,
    bpm,
    durationS: 300,
    energy: null,
    rating: null,
    tags: [],
  });
  it('reads the move after the tempo match shifts the key', () => {
    // 9A pitched up a semitone sounds as 4A: from 8A (Am) that is Fm, a chromatic mediant ↓M3.
    const t = classifyTransition(track('8A', 128), track('9A', 120), {
      ...DEFAULT_SETTINGS,
      bpmTolerance: 8,
    });
    expect(t.effectiveToKey).toBe('4A');
    expect(t.move?.id).toBe('mediant-down-major-third');
    const locked = classifyTransition(track('8A', 128), track('9A', 120), {
      ...DEFAULT_SETTINGS,
      bpmTolerance: 8,
      keyLock: true,
    });
    expect(locked.move?.id).toBe('dominant');
  });
  it('no move without a key', () => {
    expect(analyzeMove(null, '8A')).toBeNull();
  });
});
