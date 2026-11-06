import { describe, expect, it } from 'vitest';
import { poisonCritTrees, trees, withRanks, type Tree } from './talents';

const required = (tier: number) => tier * 5;

function checkTree(tree: Tree) {
  for (const t of tree.talents) {
    if (t.rank === 0) continue;
    const before = tree.talents.filter((o) => o.tier < t.tier).reduce((n, o) => n + o.rank, 0);
    expect(before, `${tree.name}: ${t.name} needs ${required(t.tier)} points in earlier tiers`).toBeGreaterThanOrEqual(required(t.tier));
    if (t.prereqTier !== null) {
      const prereq = tree.talents.find((o) => o.tier === t.prereqTier && o.col === t.col);
      expect(prereq?.rank, `${tree.name}: ${t.name} needs ${prereq?.name} maxed`).toBe(prereq?.max);
    }
  }
}

describe('gnomerogue builds', () => {
  it.each([
    ['subtlety', trees],
    ['poison crit', poisonCritTrees],
  ])('%s spends 51 points and respects tiers and prerequisites', (_, build) => {
    expect(build.reduce((n, t) => n + t.points, 0)).toBe(51);
    build.forEach(checkTree);
  });

  it('poison crit is 32 / 8 / 11 with Mutilate, Premeditation, Puncturing Wounds and full Seal Fate', () => {
    expect(poisonCritTrees.map((t) => t.points)).toEqual([32, 8, 11]);
    const all = poisonCritTrees.flatMap((t) => t.talents);
    const rank = (name: string) => all.find((t) => t.name === name)?.rank;
    expect(rank('Mutilate')).toBe(1);
    expect(rank('Venom')).toBe(1);
    expect(rank('Seal Fate')).toBe(3);
    expect(rank('Puncturing Wounds')).toBe(3);
    expect(rank('Premeditation')).toBe(1);
    expect(rank('Initiative')).toBe(0);
    expect(rank('Improved Poisons')).toBe(4);
    expect(rank('Vile Poisons')).toBe(5);
    expect(rank('Death Mark')).toBe(0);
    expect(rank('Preparation')).toBe(0);
  });

  it('withRanks rejects unknown talents and ranks over max', () => {
    expect(() => withRanks(trees, { Nope: 1 })).toThrow('Unknown talents');
    expect(() => withRanks(trees, { Malice: 6 })).toThrow('exceeds max');
  });
});
