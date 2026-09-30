import { describe, expect, it } from 'vitest';
import { dedupeTracks, findDuplicates, remapItems } from './dedupe';
import type { Track } from './types';

const t = (id: string, p: Partial<Track>): Track => ({
  id,
  sourceId: id,
  artist: '',
  title: '',
  camelot: null,
  bpm: null,
  durationS: null,
  energy: null,
  rating: null,
  tags: [],
  ...p,
});

describe('duplicate songs', () => {
  it('collapses the Bandcamp and USB copies of one song into the row with cues', () => {
    const tracks = [
      t('rb:1', {
        title: 'Tipper - Cloaked - 06 Pono',
        durationS: 238,
        camelot: '3A',
        bpm: 90,
        location: 'E:/BANDCAMP/Tipper - Cloaked/Pono.wav',
      }),
      t('rb:2', {
        artist: 'Tipper',
        title: 'Pono',
        durationS: 238,
        camelot: '3A',
        bpm: 90,
        location: 'E:/TIPPER/Tipper - Cloaked/Pono.wav',
        cues: [{ name: 'IN', start: 1, num: 7 }],
        energy: 4,
      }),
    ];
    expect(findDuplicates(tracks)).toEqual(new Map([['rb:1', 'rb:2']]));
  });

  it('matches titles an old export cut short, but only when the lengths agree', () => {
    const full = t('rb:1', { artist: 'Tipper', title: 'Relish The Trough', durationS: 310 });
    const cut = t('rb:2', {
      title: 'Tipper - Relish The Trough - 13 Relish The T',
      durationS: 311,
      camelot: '2A',
      bpm: 136,
    });
    const other = t('rb:3', { artist: 'Tipper', title: 'Relish The Trough VIP', durationS: 402 });
    const map = findDuplicates([full, cut, other]);
    expect(map.get('rb:1')).toBe('rb:2'); // the analysed row wins
    expect(map.has('rb:3')).toBe(false);
  });

  it('never merges a VIP into its original, or different lengths', () => {
    const tracks = [
      t('rb:1', { artist: 'Tipper', title: 'Ton Of Brix', durationS: 280 }),
      t('rb:2', { artist: 'Tipper', title: 'Ton Of Brix (VIP Mix)', durationS: 280 }),
      t('rb:3', { artist: 'Tipper', title: 'Ton Of Brix', durationS: 300 }),
      t('file:1', { artist: 'Tipper', title: 'Ton Of Brix VIP' }),
    ];
    expect(findDuplicates(tracks).size).toBe(0);
  });

  it('lets an imported row absorb the file row for the same song', () => {
    const tracks = [
      t('file:a', {
        artist: 'Hybrid Minds',
        title: 'Touch feat. Tiffani Juno',
        location: 'Hybrid Minds - Touch.wav',
      }),
      t('rb:9', {
        artist: 'Hybrid Minds',
        title: 'Touch feat. Tiffani Juno (Original Mix)',
        durationS: 314,
        camelot: '12B',
        bpm: 172,
      }),
    ];
    const { tracks: out, remap } = dedupeTracks(tracks);
    expect(out.map((x) => x.id)).toEqual(['rb:9']);
    expect(remap.get('file:a')).toBe('rb:9');
  });

  it('keeps what only the duplicate had and repoints playlist items', () => {
    const tracks = [
      t('rb:1', {
        artist: 'A',
        title: 'Song',
        durationS: 200,
        camelot: '8A',
        bpm: 124,
        tags: ['warmup'],
      }),
      t('rb:2', {
        artist: 'A',
        title: 'Song',
        durationS: 200,
        energy: 7,
        tags: ['peak'],
        rating: 5,
      }),
    ];
    const { tracks: out, remap } = dedupeTracks(tracks);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'rb:1', energy: 7, rating: 5, tags: ['warmup', 'peak'] });
    expect(remapItems([{ trackId: 'rb:2' }, { trackId: 'rb:1' }, { trackId: 'x' }], remap)).toEqual(
      [{ trackId: 'rb:1' }, { trackId: 'x' }],
    );
  });
});
