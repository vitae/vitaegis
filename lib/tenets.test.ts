import { describe, expect, it } from 'vitest';
import { findTenet, searchTenets, TENET_ID, tenetId, tenets } from './tenets';
import { pillars } from './pillars';

describe('tenets', () => {
  const all = tenets();

  it('gives every directive, protocol step and dossier entry one unique id', () => {
    const expected = pillars.reduce(
      (n, p) =>
        n +
        p.directives.length +
        p.protocol.length +
        p.dossiers.reduce((m, d) => m + d.entries.length, 0),
      0,
    );
    expect(all.length).toBe(expected);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
    for (const t of all) expect(t.id).toMatch(TENET_ID);
  });

  it('formats ids from the dossier code and position', () => {
    expect(tenetId('H-01', 2)).toBe('H-01.02');
    expect(tenetId('W-P', 8)).toBe('W-P.08');
  });

  it('points H-01.01 at the first circadian entry on /health', () => {
    const t = findTenet('h-01.01');
    expect(t?.pillar).toBe('health');
    expect(t?.dossierTitle.toLowerCase()).toContain('circadian');
    expect(t?.href).toBe('/health#H-01.01');
  });

  it('numbers directives under 00 and the protocol under P', () => {
    expect(findTenet('H-00.01')?.text).toBe(pillars[0].directives[0]);
    expect(findTenet('H-P.01')?.title).toBe(pillars[0].protocol[0].k);
  });

  it('searches by text within a pillar', () => {
    const hits = searchTenets({ q: 'sunlight', pillar: 'health' });
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.pillar).toBe('health');
  });
});
