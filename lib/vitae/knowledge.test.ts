import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_PREFIX, buildKnowledge } from './knowledge';

describe('knowledge base', () => {
  const docs = buildKnowledge();
  const names = docs.map((d) => d.name);

  it('has one document per pillar plus books, store, secrets and site map', () => {
    expect(names).toEqual([
      'vitae:pillar-health',
      'vitae:pillar-stealth',
      'vitae:pillar-wealth',
      'vitae:books',
      'vitae:store',
      'vitae:secrets',
      'vitae:sitemap',
    ]);
    for (const n of names) expect(n.startsWith(KNOWLEDGE_PREFIX)).toBe(true);
  });

  it('every document has text and is under the ElevenLabs text limit', () => {
    for (const d of docs) {
      expect(d.text.length).toBeGreaterThan(200);
      expect(d.text.length).toBeLessThan(300_000);
    }
  });

  it('the store document carries the single price and every product', () => {
    const store = docs.find((d) => d.name === 'vitae:store')!.text;
    expect(store).toContain('$9.99');
    expect(store).toContain('Tai Chi Flow');
    expect(store).toContain('tai-chi-flow');
  });

  it('the site map document lists every path', () => {
    const map = docs.find((d) => d.name === 'vitae:sitemap')!.text;
    for (const p of ['/health', '/books', '/secrets', '/#token']) expect(map).toContain(p);
  });

  it('a pillar document carries its protocol and directives', () => {
    const health = docs.find((d) => d.name === 'vitae:pillar-health')!.text;
    expect(health).toContain('The daily protocol');
    expect(health).toMatch(/Directives/);
  });
});
