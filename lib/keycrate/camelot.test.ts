import { describe, expect, it } from 'vitest';
import { CAMELOT_KEYS, normalizeKey, wheelDistance, wrapNumber } from './camelot';

/** Every Camelot key with its musical, Open Key and enharmonic spellings. */
const TABLE: Array<[string, string[]]> = [
  ['1A', ['Abm', 'Ab min', 'Ab minor', 'G#m', 'G# minor', '6m', '1a', '01A']],
  ['2A', ['Ebm', 'Eb minor', 'D#m', 'D# min', '7m']],
  ['3A', ['Bbm', 'Bb minor', 'A#m', 'A# minor', '8m']],
  ['4A', ['Fm', 'F min', 'F minor', '9m']],
  ['5A', ['Cm', 'C min', 'C minor', '10m']],
  ['6A', ['Gm', 'G min', 'G minor', '11m']],
  ['7A', ['Dm', 'D min', 'D minor', '12m']],
  ['8A', ['Am', 'A min', 'A minor', '1m', '8A', '8a']],
  ['9A', ['Em', 'E min', 'E minor', '2m']],
  ['10A', ['Bm', 'B min', 'B minor', '3m']],
  ['11A', ['F#m', 'F# min', 'F# minor', 'Gbm', 'Gb minor', '4m']],
  ['12A', ['Dbm', 'Db min', 'Db minor', 'C#m', 'C# minor', '5m']],
  ['1B', ['B', 'B maj', 'B major', 'Bmaj', '6d']],
  ['2B', ['F#', 'F# maj', 'F# major', 'Gb', 'Gb major', '7d']],
  ['3B', ['Db', 'Db maj', 'Db major', 'C#', 'C# major', '8d']],
  ['4B', ['Ab', 'Ab maj', 'Ab major', 'G#', 'G# major', '9d']],
  ['5B', ['Eb', 'Eb maj', 'Eb major', 'D#', 'D# major', '10d']],
  ['6B', ['Bb', 'Bb maj', 'Bb major', 'A#', 'A# major', '11d']],
  ['7B', ['F', 'F maj', 'F major', '12d']],
  ['8B', ['C', 'C maj', 'C major', '1d']],
  ['9B', ['G', 'G maj', 'G major', '2d']],
  ['10B', ['D', 'D maj', 'D major', '3d']],
  ['11B', ['A', 'A maj', 'A major', '4d']],
  ['12B', ['E', 'E maj', 'E major', 'Fb', 'Fb major', '5d']],
];

describe('normalizeKey', () => {
  it('covers all 24 keys', () => {
    expect(TABLE.map(([k]) => k).sort()).toEqual([...CAMELOT_KEYS].sort());
  });

  for (const [camelot, spellings] of TABLE) {
    it(`maps every spelling of ${camelot}`, () => {
      for (const s of spellings) expect(normalizeKey(s), s).toBe(camelot);
    });
  }

  it('treats sharps and flats as the same key', () => {
    expect(normalizeKey('D#m')).toBe(normalizeKey('Ebm'));
    expect(normalizeKey('D#m')).toBe('2A');
  });

  it('accepts unicode accidentals and loose spacing', () => {
    expect(normalizeKey('F♯ minor')).toBe('11A');
    expect(normalizeKey('E♭  major')).toBe('5B');
    expect(normalizeKey('  8 A ')).toBe('8A');
  });

  it('rejects junk', () => {
    expect(normalizeKey('')).toBeNull();
    expect(normalizeKey('13A')).toBeNull();
    expect(normalizeKey('0A')).toBeNull();
    expect(normalizeKey('H minor')).toBeNull();
    expect(normalizeKey('Am7')).toBeNull();
    expect(normalizeKey(null)).toBeNull();
    expect(normalizeKey(undefined)).toBeNull();
  });
});

describe('wheel math', () => {
  it('wraps 1–12', () => {
    expect(wrapNumber(13)).toBe(1);
    expect(wrapNumber(0)).toBe(12);
    expect(wrapNumber(-1)).toBe(11);
    expect(wrapNumber(12)).toBe(12);
  });

  it('measures the short way around', () => {
    expect(wheelDistance(1, 12)).toBe(-1);
    expect(wheelDistance(12, 1)).toBe(1);
    expect(wheelDistance(8, 10)).toBe(2);
    expect(wheelDistance(8, 3)).toBe(-5);
    expect(wheelDistance(2, 8)).toBe(6);
  });
});
