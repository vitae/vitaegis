import { describe, expect, it } from 'vitest';
import { bandFit, MODE_PROFILES, tempoPocketFit, trackEnergy } from './modes';
import { shiftAllowed, suggestNext } from './suggest';
import { setTransitions } from './harmonic';
import { DEFAULT_SETTINGS, type BuildMode, type Camelot, type Track } from './types';

let n = 0;
const track = (
  camelot: Camelot | null,
  bpm: number | null,
  energy: number | null = null,
): Track => ({
  id: `m${++n}`,
  sourceId: `m${n}`,
  artist: 'a',
  title: `m${n}`,
  camelot,
  bpm,
  durationS: 300,
  energy,
  rating: null,
  tags: [],
});
const settings = (mode: BuildMode, over = {}) => ({
  ...DEFAULT_SETTINGS,
  mode,
  keyLock: true,
  ...over,
});

describe('mode helpers', () => {
  it('energy is the 1–10 tag, else a tempo proxy', () => {
    expect(trackEnergy(track('8A', 90, 7))).toBeCloseTo(0.7);
    expect(trackEnergy(track('8A', 60))).toBe(0);
    expect(trackEnergy(track('8A', 170))).toBe(1);
    expect(trackEnergy(track('8A', null))).toBeNull();
  });
  it('band fit is 1 inside and falls off outside', () => {
    expect(bandFit(0.4, [0.3, 0.5], 0.4)).toBe(1);
    expect(bandFit(0.7, [0.3, 0.5], 0.4)).toBeCloseTo(0.5);
    expect(bandFit(0, [0.3, 0.5], 0.3)).toBe(0);
  });
  it('tempo pocket folds half- and double-time', () => {
    expect(tempoPocketFit(85, [70, 100])).toBe(1);
    expect(tempoPocketFit(170, [70, 100])).toBe(1); // half-time 85
    expect(tempoPocketFit(70, [128, 150])).toBe(1); // double-time 140
    expect(tempoPocketFit(118, [70, 100])).toBeLessThan(0.5);
  });
});

describe('downtempo', () => {
  it('prefers the 70–100 pocket and low energy, relative over fifth', () => {
    const last = track('8A', 90, 4);
    const pocket = track('8B', 92, 4); // relative, in pocket
    const fifth = track('9A', 92, 4); // fifth, in pocket
    const loud = track('8B', 92, 9); // relative but high energy
    const s = suggestNext([last], [loud, fifth, pocket], settings('downtempo'));
    expect(s.map((x) => x.track.id)).toEqual([pocket.id, fifth.id, loud.id]);
  });
  it('allows a chromatic-mediant colour shift, then rations it for 15 tracks', () => {
    const lib = [track('11A', 90, 4)]; // Am → F#m, chromatic mediant
    expect(suggestNext([track('8A', 90, 4)], lib, settings('downtempo')).length).toBe(1);
    const recent = [track('8A', 90, 4), track('11A', 90, 4), track('11A', 90, 4)];
    expect(
      shiftAllowed(setTransitions(recent, settings('downtempo')), MODE_PROFILES.downtempo),
    ).toBe(false);
    expect(suggestNext(recent, [track('2A', 90, 4)], settings('downtempo')).length).toBe(0); // F#m → Ebm, another mediant
  });
});

describe('uptempo', () => {
  it('favours fifths and semitone lifts in the 128–150 pocket with high energy', () => {
    const last = track('8A', 138, 8);
    const fifth = track('9A', 138, 8);
    const same = track('8A', 138, 8);
    const slow = track('9A', 100, 8); // out of the tolerance anyway
    const s = suggestNext([last], [same, slow, fifth], settings('uptempo'));
    expect(s[0].track.id).toBe(fifth.id);
    expect(s.some((x) => x.track.id === slow.id)).toBe(false);
  });
  it('rewards a small upward tempo creep over the same step down', () => {
    const last = track('9A', 138, 8);
    const up = track('10A', 142, 8); // incoming is faster: pitched down ~2.8%
    const down = track('8A', 134, 8); // incoming is slower
    const s = suggestNext([last], [down, up], settings('uptempo'));
    expect(s[0].track.id).toBe(up.id);
  });
});

describe('ambient', () => {
  it('ignores tempo, keeps beatless tracks and prefers the closest keys', () => {
    const last = track('8A', 80, 2);
    const beatless = track('8B', null, 2); // relative, no BPM
    const farTempo = track('8A', 105, 2); // +31%: fine in ambient
    const boost = track('10A', 80, 2);
    const s = suggestNext([last], [boost, farTempo, beatless], settings('ambient'));
    const ids = s.map((x) => x.track.id);
    expect(ids).toContain(beatless.id);
    expect(ids).toContain(farTempo.id);
    expect(ids.indexOf(boost.id)).toBe(ids.length - 1);
    expect(s.find((x) => x.track.id === beatless.id)!.reason).toContain('beatless');
  });
  it('leaves out semitone and chromatic moves', () => {
    const s = suggestNext(
      [track('8A', 80, 2)],
      [track('3A', 80, 2), track('4B', 80, 2)],
      settings('ambient'),
    );
    expect(s.length).toBe(0);
  });
});
