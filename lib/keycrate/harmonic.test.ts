import { describe, expect, it } from 'vitest';
import {
  classifyKeys,
  classifyTransition,
  matchBpm,
  pitchPercent,
  pitchedKey,
  semitonesForPitch,
  shiftKey,
} from './harmonic';
import { DEFAULT_SETTINGS, type Track } from './types';

const track = (over: Partial<Track>): Track => ({
  id: 'x',
  sourceId: 'x',
  artist: 'a',
  title: 't',
  camelot: '8A',
  bpm: 124,
  durationS: 300,
  energy: null,
  rating: null,
  tags: [],
  ...over,
});

describe('classifyKeys', () => {
  it('same key', () => expect(classifyKeys('8A', '8A')).toBe('same'));
  it('perfect fifth either way, wrapping 12↔1', () => {
    expect(classifyKeys('8A', '9A')).toBe('fifth');
    expect(classifyKeys('8A', '7A')).toBe('fifth');
    expect(classifyKeys('12B', '1B')).toBe('fifth');
    expect(classifyKeys('1A', '12A')).toBe('fifth');
  });
  it('relative major/minor', () => {
    expect(classifyKeys('8A', '8B')).toBe('relative');
    expect(classifyKeys('3B', '3A')).toBe('relative');
  });
  it('diagonal: ±1 with a letter swap', () => {
    expect(classifyKeys('8A', '9B')).toBe('diagonal');
    expect(classifyKeys('8B', '7A')).toBe('diagonal');
    expect(classifyKeys('12A', '1B')).toBe('diagonal');
  });
  it('energy boost is +2 same letter only', () => {
    expect(classifyKeys('8A', '10A')).toBe('boost');
    expect(classifyKeys('11B', '1B')).toBe('boost');
    expect(classifyKeys('8A', '6A')).not.toBe('boost');
  });
  it('semitone lift is +7 same letter', () => {
    expect(classifyKeys('8A', '3A')).toBe('semitone');
    expect(classifyKeys('1B', '8B')).toBe('semitone');
  });
  it('thirds are ±3 or ±4 same letter', () => {
    expect(classifyKeys('8A', '11A')).toBe('third');
    expect(classifyKeys('8A', '5A')).toBe('third');
    expect(classifyKeys('8A', '12A')).toBe('third');
    expect(classifyKeys('8A', '4A')).toBe('third');
  });
  it('everything else clashes', () => {
    expect(classifyKeys('8A', '6A')).toBe('clash'); // −2
    expect(classifyKeys('8A', '2A')).toBe('clash'); // +6
    expect(classifyKeys('8A', '10B')).toBe('clash');
    expect(classifyKeys('8A', '6B')).toBe('clash');
  });
  it('unknown when a key is missing', () => {
    expect(classifyKeys(null, '8A')).toBe('unknown');
    expect(classifyKeys('8A', null)).toBe('unknown');
  });
});

describe('pitch math', () => {
  it('percent needed to tempo match', () => {
    expect(pitchPercent(120, 126)).toBeCloseTo(5);
    expect(pitchPercent(130, 124.15)).toBeCloseTo(-4.5);
  });
  it('about 6% per semitone', () => {
    expect(semitonesForPitch(5.946)).toBeCloseTo(1, 2);
    expect(semitonesForPitch(-5.613)).toBeCloseTo(-1, 2);
    expect(semitonesForPitch(12.246)).toBeCloseTo(2, 2);
  });
  it('a semitone is +7 on the wheel with the same letter', () => {
    expect(shiftKey('8A', 1)).toBe('3A');
    expect(shiftKey('8A', -1)).toBe('1A');
    expect(shiftKey('8B', 2)).toBe('10B');
    expect(shiftKey('8A', 0)).toBe('8A');
  });
  it('within ±3% the key stays put', () => {
    expect(pitchedKey('8A', 124, 127, false)).toMatchObject({ semitones: 0, effectiveKey: '8A' });
  });
  it('past ±3% the key drifts by the nearest semitone', () => {
    const up = pitchedKey('8A', 120, 127, false);
    expect(up.semitones).toBe(1);
    expect(up.effectiveKey).toBe('3A');
    const down = pitchedKey('8A', 130, 122, false);
    expect(down.semitones).toBe(-1);
    expect(down.effectiveKey).toBe('1A');
  });
  it('key lock pins the key', () => {
    expect(pitchedKey('8A', 120, 128, true)).toMatchObject({ semitones: 0, effectiveKey: '8A' });
  });
});

describe('matchBpm', () => {
  it('direct match inside tolerance', () => {
    expect(matchBpm(124, 128, 6)).toMatchObject({ kind: 'direct' });
    expect(matchBpm(124, 128, 6)!.percent).toBeCloseTo(-3.125);
  });
  it('half-time: 70 sits under 140', () => {
    expect(matchBpm(140, 70, 6)).toMatchObject({ kind: 'half', effectiveBpm: 140, percent: 0 });
    expect(matchBpm(140, 72, 6)!.kind).toBe('half');
  });
  it('double-time: 170 sits over 85', () => {
    expect(matchBpm(85, 170, 6)).toMatchObject({ kind: 'double', effectiveBpm: 85 });
  });
  it('out of range is null and tolerance is adjustable', () => {
    expect(matchBpm(124, 136, 6)).toBeNull();
    expect(matchBpm(124, 136, 10)).not.toBeNull();
    expect(matchBpm(null, 120, 6)).toBeNull();
  });
});

describe('classifyTransition', () => {
  it('reads like the suggestion panel', () => {
    const t = classifyTransition(
      track({ camelot: '8A', bpm: 124 }),
      track({ camelot: '9A', bpm: 126 }),
      DEFAULT_SETTINGS,
    );
    expect(t.type).toBe('fifth');
    expect(t.reason).toBe('Perfect 5th, -1.6% BPM');
    expect(t.clash).toBe(false);
  });
  it('classifies with the pitched key when the tempo match is big', () => {
    // 9A pitched up a semitone becomes 4A: from 8A that is a third, not the fifth it looks like.
    const t = classifyTransition(
      track({ camelot: '8A', bpm: 128 }),
      track({ camelot: '9A', bpm: 120 }),
      {
        ...DEFAULT_SETTINGS,
        bpmTolerance: 8,
      },
    );
    expect(t.semitoneShift).toBe(1);
    expect(t.effectiveToKey).toBe('4A');
    expect(t.type).toBe('third');
    const locked = classifyTransition(
      track({ camelot: '8A', bpm: 128 }),
      track({ camelot: '9A', bpm: 120 }),
      {
        ...DEFAULT_SETTINGS,
        bpmTolerance: 8,
        keyLock: true,
      },
    );
    expect(locked.type).toBe('fifth');
  });
  it('labels half-time matches', () => {
    const t = classifyTransition(
      track({ camelot: '8A', bpm: 140 }),
      track({ camelot: '8A', bpm: 70 }),
      DEFAULT_SETTINGS,
    );
    expect(t.bpm?.kind).toBe('half');
    expect(t.reason).toContain('half-time');
  });
});
