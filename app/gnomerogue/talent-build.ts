import type { Tree } from './talents';

export const MAX_POINTS = 51;
export const TIER_POINTS = 5;
export const COLUMNS = 4;
export const BUILD_PARAM = 't';

const TREE_LETTERS = ['A', 'B', 'C'];

export type Pick = { tree: number; idx: number };

export type Build = {
  alloc: number[][];
  order: Pick[];
};

export type OrderGroup = Pick & { levelStart: number; levelEnd: number; rank: number };

export const levelFor = (points: number) => (points <= 0 ? 0 : 9 + Math.min(points, MAX_POINTS));

export function emptyBuild(trees: Tree[]): Build {
  return { alloc: trees.map((t) => t.talents.map(() => 0)), order: [] };
}

export function treePoints(trees: Tree[], b: Build, tree: number, belowTier = Infinity, alloc = b.alloc[tree]) {
  return trees[tree].talents.reduce((n, t, i) => (t.tier < belowTier ? n + alloc[i] : n), 0);
}

export const totalPoints = (trees: Tree[], b: Build) => trees.reduce((n, _, i) => n + treePoints(trees, b, i), 0);
export const pointsLeft = (trees: Tree[], b: Build) => Math.max(0, MAX_POINTS - totalPoints(trees, b));
export const requiredLevel = (trees: Tree[], b: Build) => levelFor(totalPoints(trees, b));

export function prereqIndex(trees: Tree[], tree: number, idx: number) {
  const t = trees[tree].talents[idx];
  if (t.prereqTier === null) return -1;
  return trees[tree].talents.findIndex((o) => o.tier === t.prereqTier && o.col === t.col);
}

export function prereqMissing(trees: Tree[], b: Build, tree: number, idx: number, alloc = b.alloc[tree]) {
  const p = prereqIndex(trees, tree, idx);
  if (p < 0) return 0;
  return Math.max(0, trees[tree].talents[p].max - alloc[p]);
}

export function tierUnlocked(trees: Tree[], b: Build, tree: number, idx: number, alloc = b.alloc[tree]) {
  const tier = trees[tree].talents[idx].tier;
  return treePoints(trees, b, tree, tier, alloc) >= tier * TIER_POINTS;
}

export function requirementsMet(trees: Tree[], b: Build, tree: number, idx: number, alloc = b.alloc[tree]) {
  return tierUnlocked(trees, b, tree, idx, alloc) && prereqMissing(trees, b, tree, idx, alloc) === 0;
}

export const available = (trees: Tree[], b: Build, tree: number, idx: number) =>
  pointsLeft(trees, b) > 0 && requirementsMet(trees, b, tree, idx);

export function canAdd(trees: Tree[], b: Build, tree: number, idx: number) {
  const t = trees[tree]?.talents[idx];
  return !!t && b.alloc[tree][idx] < t.max && available(trees, b, tree, idx);
}

export function canRemove(trees: Tree[], b: Build, tree: number, idx: number) {
  if (b.alloc[tree][idx] <= 0) return false;
  const sim = [...b.alloc[tree]];
  sim[idx]--;
  return sim.every((n, i) => n === 0 || requirementsMet(trees, b, tree, i, sim));
}

export function add(trees: Tree[], b: Build, tree: number, idx: number): Build {
  if (!canAdd(trees, b, tree, idx)) return b;
  const alloc = b.alloc.map((a, i) => (i === tree ? a.map((n, j) => (j === idx ? n + 1 : n)) : a));
  return { alloc, order: [...b.order, { tree, idx }] };
}

export function remove(trees: Tree[], b: Build, tree: number, idx: number): Build {
  if (!canRemove(trees, b, tree, idx)) return b;
  const alloc = b.alloc.map((a, i) => (i === tree ? a.map((n, j) => (j === idx ? n - 1 : n)) : a));
  const order = [...b.order];
  for (let i = order.length - 1; i >= 0; i--) {
    if (order[i].tree === tree && order[i].idx === idx) {
      order.splice(i, 1);
      break;
    }
  }
  return { alloc, order };
}

export function resetTree(trees: Tree[], b: Build, tree: number): Build {
  return {
    alloc: b.alloc.map((a, i) => (i === tree ? a.map(() => 0) : a)),
    order: b.order.filter((p) => p.tree !== tree),
  };
}

export function orderGroups(b: Build): OrderGroup[] {
  const groups: OrderGroup[] = [];
  b.order.forEach((p, i) => {
    const level = levelFor(i + 1);
    const last = groups[groups.length - 1];
    if (last && last.tree === p.tree && last.idx === p.idx) {
      last.levelEnd = level;
      last.rank++;
      return;
    }
    groups.push({ ...p, levelStart: level, levelEnd: level, rank: 1 });
  });
  return groups;
}

function positionChar(tier: number, col: number) {
  const v = tier * COLUMNS + col;
  return v <= 9 ? String(v) : String.fromCharCode(v + 87);
}

function charPosition(ch: string) {
  const code = ch.charCodeAt(0);
  const v = code <= 57 ? code - 48 : code - 87;
  return { tier: Math.floor(v / COLUMNS), col: v % COLUMNS };
}

export function encode(trees: Tree[], b: Build) {
  let out = '';
  let current = -1;
  for (const p of b.order) {
    if (p.tree !== current) {
      out += TREE_LETTERS[p.tree];
      current = p.tree;
    }
    const t = trees[p.tree].talents[p.idx];
    out += positionChar(t.tier, t.col);
  }
  return out;
}

export function decode(trees: Tree[], text: string): Build {
  let b = emptyBuild(trees);
  let tree = -1;
  for (const ch of text) {
    const letter = TREE_LETTERS.indexOf(ch);
    if (letter >= 0) {
      tree = letter;
      continue;
    }
    if (tree < 0 || tree >= trees.length || !/[0-9a-z]/.test(ch)) continue;
    const pos = charPosition(ch);
    const idx = trees[tree].talents.findIndex((t) => t.tier === pos.tier && t.col === pos.col);
    if (idx >= 0) b = add(trees, b, tree, idx);
  }
  return b;
}

/** Turns a ranked build (talents.ts data) into a Build by taking talents tier by tier. */
export function fromRanks(trees: Tree[], ranked: Tree[]): Build {
  let b = emptyBuild(trees);
  const picks = ranked.flatMap((tree, ti) =>
    tree.talents.flatMap((t, idx) => Array.from({ length: t.rank }, () => ({ tree: ti, idx, tier: t.tier, col: t.col }))),
  );
  picks.sort((x, y) => x.tier - y.tier || x.tree - y.tree || x.col - y.col);
  let remaining = picks;
  while (remaining.length) {
    const next = remaining.find((p) => canAdd(trees, b, p.tree, p.idx));
    if (!next) break;
    b = add(trees, b, next.tree, next.idx);
    remaining = remaining.filter((p) => p !== next);
  }
  return b;
}

export function readBuildParam(hash: string): string | null {
  const query = hash.replace(/^#/, '');
  const start = query.indexOf('?');
  if (start < 0) return null;
  for (const part of query.slice(start + 1).split('&')) {
    const [key, value] = part.split('=');
    if (key === BUILD_PARAM) return value ?? '';
  }
  return null;
}

export const colorSegments = (text: string) => {
  const segments: { text: string; color: string | null }[] = [];
  const re = /\|c[0-9a-f]{2}([0-9a-f]{6})|\|r/gi;
  let color: string | null = null;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) segments.push({ text: text.slice(last, at), color });
    color = m[1] ? `#${m[1]}` : null;
    last = at + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), color });
  return segments;
};
