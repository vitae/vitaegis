import { describe, expect, it } from 'vitest';
import { poisonCritTrees, trees } from './talents';
import {
  add,
  canAdd,
  canRemove,
  decode,
  emptyBuild,
  encode,
  fromRanks,
  orderGroups,
  pointsLeft,
  readBuildParam,
  remove,
  requiredLevel,
  resetTree,
  treePoints,
} from './talent-build';

const TAVERN_LINK = 'B000A2222211444889aaeeedhccccciimmpC111222225AmB22444AeC49';

const idx = (tree: number, name: string) => trees[tree].talents.findIndex((t) => t.name === name);
const ranks = (b: ReturnType<typeof emptyBuild>) =>
  Object.fromEntries(trees.flatMap((tree, ti) => tree.talents.map((t, i) => [t.name, b.alloc[ti][i]])));

describe('talent build', () => {
  it('decodes the pasted Warcraft Tavern link the way the Tavern page does', () => {
    // The pasted link takes Venom at 19 points and Mutilate at 28, before their tiers unlock,
    // so both are skipped and the page shows 30 / 8 / 11 with 2 points left at level 58.
    const b = decode(trees, TAVERN_LINK);
    expect([0, 1, 2].map((t) => treePoints(trees, b, t))).toEqual([30, 8, 11]);
    const r = ranks(b);
    expect(r.Venom).toBe(0);
    expect(r.Mutilate).toBe(0);
    expect(r['Cold Blood']).toBe(1);
    expect(r['Seal Fate']).toBe(3);
    expect(pointsLeft(trees, b)).toBe(2);
    expect(requiredLevel(trees, b)).toBe(58);
    expect(encode(trees, b)).toBe('B000A2222211444889aaeeedccccciimmC111222225AmB22444AeC49');
  });

  it('builds the full 31 / 8 / 12 Poison Crit Stun from talents.ts and round-trips its link', () => {
    const b = fromRanks(trees, poisonCritTrees);
    expect([0, 1, 2].map((t) => treePoints(trees, b, t))).toEqual([31, 8, 12]);
    const r = ranks(b);
    expect(r.Mutilate).toBe(1);
    expect(r.Venom).toBe(1);
    expect(r['Improved Poisons']).toBe(3);
    expect(r['Dirty Deeds']).toBe(2);
    expect(r.Premeditation).toBe(1);
    expect(r.Initiative).toBe(0);
    expect(pointsLeft(trees, b)).toBe(0);
    expect(requiredLevel(trees, b)).toBe(60);
    const link = encode(trees, b);
    expect(ranks(decode(trees, link))).toEqual(r);
  });

  it('builds the Subtlety spec from its ranks without dropping points', () => {
    const b = fromRanks(trees, trees);
    expect([0, 1, 2].map((t) => treePoints(trees, b, t))).toEqual([10, 5, 36]);
    expect(ranks(b)['Death Mark']).toBe(1);
  });

  it('enforces tier gates and prerequisites', () => {
    let b = emptyBuild(trees);
    expect(canAdd(trees, b, 0, idx(0, 'Ruthlessness'))).toBe(false);
    for (let i = 0; i < 5; i++) b = add(trees, b, 0, idx(0, 'Malice'));
    expect(canAdd(trees, b, 0, idx(0, 'Ruthlessness'))).toBe(true);
    expect(canAdd(trees, b, 0, idx(0, 'Lethality'))).toBe(false);
    for (let i = 0; i < 5; i++) b = add(trees, b, 0, idx(0, 'Improved Gouge'));
    expect(treePoints(trees, b, 0)).toBe(8);
    expect(canAdd(trees, b, 0, idx(0, 'Lethality'))).toBe(false);
    b = add(trees, b, 0, idx(0, 'Remorseless Attacks'));
    b = add(trees, b, 0, idx(0, 'Remorseless Attacks'));
    expect(canAdd(trees, b, 0, idx(0, 'Lethality'))).toBe(true);
  });

  it('refuses to remove a point that a later talent depends on', () => {
    const b = fromRanks(trees, poisonCritTrees);
    expect(canRemove(trees, b, 0, idx(0, 'Venom'))).toBe(false);
    expect(canRemove(trees, b, 0, idx(0, 'Malice'))).toBe(false);
    expect(canRemove(trees, b, 0, idx(0, 'Mutilate'))).toBe(true);
    const after = remove(trees, b, 0, idx(0, 'Mutilate'));
    expect(canRemove(trees, after, 0, idx(0, 'Venom'))).toBe(true);
    expect(pointsLeft(trees, after)).toBe(1);
  });

  it('caps at 51 points and resets a tree', () => {
    const b = fromRanks(trees, poisonCritTrees);
    expect(canAdd(trees, b, 1, idx(1, 'Precision'))).toBe(false);
    const reset = resetTree(trees, b, 1);
    expect(treePoints(trees, reset, 1)).toBe(0);
    expect(pointsLeft(trees, reset)).toBe(8);
    expect(encode(trees, reset)).not.toContain('B');
  });

  it('groups the talent order by level', () => {
    const groups = orderGroups(decode(trees, TAVERN_LINK));
    expect(groups[0]).toMatchObject({ tree: 1, levelStart: 10, levelEnd: 12, rank: 3 });
    expect(groups[groups.length - 1]).toMatchObject({ tree: 2, levelStart: 58, levelEnd: 58, rank: 1 });
  });

  it('reads the build from a Warcraft Tavern style hash', () => {
    expect(readBuildParam(`#?t=${TAVERN_LINK}`)).toBe(TAVERN_LINK);
    expect(readBuildParam('#subtlety')).toBeNull();
  });
});
