import { describe, expect, it } from 'vitest';
import {
  buildFromCurve,
  dramaticAllowed,
  journeyTarget,
  sampleCurve,
  suggestNext,
} from './suggest';
import { setTransitions } from './harmonic';
import { DEFAULT_SETTINGS, type Camelot, type Track } from './types';

let n = 0;
const track = (
  camelot: Camelot | null,
  bpm: number | null,
  energy: number | null = null,
): Track => ({
  id: `t${++n}`,
  sourceId: `t${n}`,
  artist: 'a',
  title: `t${n}`,
  camelot,
  bpm,
  durationS: 300,
  energy,
  rating: null,
  tags: [],
});

describe('curves', () => {
  it('samples linearly between control points', () => {
    expect(sampleCurve([100, 200], 0.5)).toBe(150);
    expect(sampleCurve([1, 5, 9], 0.25)).toBe(3);
    expect(sampleCurve([7], 0.9)).toBe(7);
    expect(sampleCurve([1, 2], 1)).toBe(2);
  });
  it('maps set position to the curve', () => {
    const c = { energy: [2, 10, 4], bpm: [120, 130, 124], length: 5 };
    expect(journeyTarget(c, 0)).toEqual({ energy: 2, bpm: 120 });
    expect(journeyTarget(c, 2)).toEqual({ energy: 10, bpm: 130 });
    expect(journeyTarget(c, 4)).toEqual({ energy: 4, bpm: 124 });
  });
});

describe('suggestNext', () => {
  const last = track('8A', 124);
  const lib = [
    track('8A', 124), // same
    track('9A', 125), // fifth
    track('8B', 123), // relative
    track('9B', 126), // diagonal
    track('10A', 124), // boost
    track('3A', 124), // semitone
    track('11A', 124), // third
    track('2A', 124), // clash
    track('8A', 150), // bpm out of range
    track('8A', 62), // half-time
  ];

  it('smooth mode keeps only harmonic moves inside the tempo window', () => {
    const s = suggestNext([last], lib, DEFAULT_SETTINGS);
    const types = s.map((x) => x.transition.type);
    expect(types).toEqual(expect.arrayContaining(['same', 'fifth', 'relative', 'diagonal']));
    expect(types).not.toContain('boost');
    expect(types).not.toContain('clash');
    expect(s.some((x) => x.track.bpm === 150)).toBe(false);
    expect(s.some((x) => x.track.bpm === 62 && x.transition.bpm?.kind === 'half')).toBe(true);
    expect(s[0].transition.type).toBe('same');
    expect(s[0].reason).toBe('Same key, +0% BPM');
  });

  it('dramatic mode allows big moves but only one per N tracks', () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'dramatic' as const, dramaticEvery: 3 };
    const fresh = suggestNext([last], lib, settings);
    expect(fresh.map((x) => x.transition.type)).toEqual(
      expect.arrayContaining(['boost', 'semitone', 'third']),
    );

    const set = [track('8A', 124), track('10A', 124), track('10A', 124)]; // boost one step back
    expect(dramaticAllowed(setTransitions(set, settings), 3)).toBe(false);
    const gated = suggestNext(set, lib, settings);
    expect(gated.some((x) => x.transition.dramatic)).toBe(false);

    const older = [track('8A', 124), track('10A', 124), track('10A', 124), track('10A', 124)];
    expect(dramaticAllowed(setTransitions(older, settings), 3)).toBe(true);
  });

  it('journey mode ranks by fit to the next curve point', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      mode: 'journey' as const,
      keyLock: true,
      journey: { energy: [2, 9], bpm: [120, 128], length: 2 },
    };
    const soft = track('9A', 122, 2);
    const hard = track('9A', 128, 9);
    const s = suggestNext([track('8A', 122, 2)], [soft, hard], settings);
    expect(s[0].track.id).toBe(hard.id);
    expect(s[0].reason).toContain('target 128 BPM');
  });

  it('excludes tracks already in the set and honours the limit', () => {
    const s = suggestNext([last], [last, ...lib], DEFAULT_SETTINGS, { limit: 2 });
    expect(s.length).toBe(2);
    expect(s.some((x) => x.track.id === last.id)).toBe(false);
  });
});

describe('buildFromCurve', () => {
  it('walks the curve with whatever the crate has', () => {
    const lib = [
      track('8A', 120, 2),
      track('9A', 122, 4),
      track('10A', 125, 6),
      track('11A', 128, 8),
      track('12A', 130, 10),
    ];
    const set = buildFromCurve(
      lib,
      { energy: [2, 10], bpm: [120, 130], length: 4 },
      DEFAULT_SETTINGS,
    );
    expect(set.length).toBe(4);
    expect(set[0].bpm).toBe(120);
    expect(new Set(set.map((t) => t.id)).size).toBe(4);
  });
});
