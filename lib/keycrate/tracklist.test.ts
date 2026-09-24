import { describe, expect, it } from 'vitest';
import { matchTracklist, normalizeName, parseLine, parseTracklist, similarity } from './tracklist';
import type { Track } from './types';

describe('parseLine', () => {
  it('timestamped lines with en dash and remix', () => {
    expect(parseLine('0:00 Bicep – Glue (Extended Mix)')).toMatchObject({
      artist: 'Bicep',
      title: 'Glue',
      remix: 'Extended Mix',
      timestamp: 0,
      isId: false,
    });
    expect(parseLine('[1:02:15] Four Tet - Baby')).toMatchObject({ artist: 'Four Tet', title: 'Baby', timestamp: 3735 });
  });
  it('numbered lists and bullets', () => {
    expect(parseLine('12. Overmono - So U Kno')).toMatchObject({ artist: 'Overmono', title: 'So U Kno' });
    expect(parseLine('3) Fred again.. - Marea (we\'ve lost dancing)')).toMatchObject({
      artist: 'Fred again..',
      title: "Marea (we've lost dancing)",
      remix: null,
    });
    expect(parseLine('- Skee Mask - Rev8617')).toMatchObject({ artist: 'Skee Mask', title: 'Rev8617' });
  });
  it('1001tracklists copy with labels and w/ markers', () => {
    expect(parseLine('05. Peggy Gou - It Goes Like (Nanana) [XL]')).toMatchObject({ artist: 'Peggy Gou', title: 'It Goes Like (Nanana)' });
    expect(parseLine('w/ Daft Punk - One More Time [Virgin]')).toMatchObject({ artist: 'Daft Punk', title: 'One More Time' });
    expect(parseLine('07. ID - ID')).toMatchObject({ isId: true });
    expect(parseLine('ID - ID')?.isId).toBe(true);
  });
  it('square-bracket remixes', () => {
    expect(parseLine('Bicep - Apricots [Overmono Remix]')).toMatchObject({ title: 'Apricots', remix: 'Overmono Remix' });
  });
  it('skips blanks and headers', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('Tracklist')).toBeNull();
    expect(parseTracklist('a - b\n\nnot a line\nc - d').length).toBe(2);
  });
});

describe('normalizeName', () => {
  it('unifies feat, &, brackets and case', () => {
    expect(normalizeName('Disclosure feat. Sam Smith')).toBe('disclosure sam smith');
    expect(normalizeName('Disclosure & Sam Smith')).toBe('disclosure sam smith');
    expect(normalizeName('Glue (Extended Mix)')).toBe('glue');
    expect(normalizeName('Éclair')).toBe('eclair');
  });
  it('similarity is symmetric and 1 on identity', () => {
    expect(similarity('bicep glue', 'bicep glue')).toBe(1);
    expect(similarity('bicep glue', 'bicep glu')).toBeCloseTo(similarity('bicep glu', 'bicep glue'));
    expect(similarity('bicep', 'overmono')).toBeLessThan(0.3);
  });
});

describe('matchTracklist', () => {
  const t = (id: string, artist: string, title: string): Track => ({
    id,
    sourceId: id,
    artist,
    title,
    camelot: '8A',
    bpm: 124,
    durationS: 300,
    energy: null,
    rating: null,
    tags: [],
  });
  const lib = [
    t('1', 'Bicep', 'Glue'),
    t('2', 'Disclosure feat. Sam Smith', 'Latch (Extended Mix)'),
    t('3', 'Overmono', 'So U Kno'),
  ];
  it('matches through feat/remix noise and flags the rest', () => {
    const lines = parseTracklist(['0:00 Bicep – Glue (Original Mix)', '5:10 Disclosure & Sam Smith - Latch', '9:00 ID - ID', '12:00 Nobody - Nothing Here'].join('\n'));
    const m = matchTracklist(lines, lib);
    expect(m.map((x) => x.status)).toEqual(['matched', 'matched', 'id', 'missing']);
    expect(m[0].track?.id).toBe('1');
    expect(m[1].track?.id).toBe('2');
  });
});
