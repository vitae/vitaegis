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

  it('poison crit is 31 / 0 / 20 with Mutilate and no Death Mark', () => {
    expect(poisonCritTrees.map((t) => t.points)).toEqual([31, 0, 20]);
    const all = poisonCritTrees.flatMap((t) => t.talents);
    expect(all.find((t) => t.name === 'Death Mark')?.rank).toBe(0);
    expect(all.find((t) => t.name === 'Venom')?.rank).toBe(1);
    expect(all.find((t) => t.name === 'Improved Poisons')?.rank).toBe(5);
    expect(all.find((t) => t.name === 'Vile Poisons')?.rank).toBe(5);
    expect(all.find((t) => t.name === 'Mutilate')?.rank).toBe(1);
    expect(all.find((t) => t.name === 'Preparation')?.rank).toBe(0);
  });

  it('withRanks rejects unknown talents and ranks over max', () => {
    expect(() => withRanks(trees, { Nope: 1 })).toThrow('Unknown talents');
    expect(() => withRanks(trees, { Malice: 6 })).toThrow('exceeds max');
  });
});
