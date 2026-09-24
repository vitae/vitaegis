import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filterTracks, indexTracks } from './filters';
import { CAMELOT_KEYS } from './camelot';
import type { Track } from './types';

function bigLibrary(n: number): Track[] {
  const out: Track[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `t${i}`,
      sourceId: `${i}`,
      artist: `Artist ${i % 977}`,
      title: `Title ${i} ${i % 13 === 0 ? 'peak' : 'roll'}`,
      camelot: CAMELOT_KEYS[i % 24],
      bpm: 100 + (i % 80),
      durationS: 300,
      genre: ['House', 'Techno', 'Breaks'][i % 3],
      label: `Label ${i % 50}`,
      energy: (i % 10) + 1,
      rating: i % 6,
      tags: i % 7 === 0 ? ['closer'] : [],
    });
  }
  return out;
}

describe('filterTracks', () => {
  const lib = bigLibrary(20000);
  const index = indexTracks(lib);

  it('filters 20k tracks in under 100 ms', () => {
    const t0 = performance.now();
    const r = filterTracks(index, { ...EMPTY_FILTERS, query: 'peak label 7', keys: new Set(['8A', '9A']), bpmMin: 120, bpmMax: 130 }, new Set());
    const ms = performance.now() - t0;
    expect(r.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(100);
  });

  it('applies every filter', () => {
    const used = new Set(['t1', 't25']);
    const r = filterTracks(index, { ...EMPTY_FILTERS, keys: new Set(['2A']), unusedOnly: true, genres: new Set(['Techno']), ratingMin: 1 }, used);
    expect(r.every((t) => t.camelot === '2A' && t.genre === 'Techno' && (t.rating ?? 0) >= 1 && !used.has(t.id))).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    const untagged = filterTracks(indexTracks([{ ...lib[0], camelot: null }, lib[1]]), { ...EMPTY_FILTERS, needsAnalysisOnly: true }, new Set());
    expect(untagged.length).toBe(1);
  });
});
