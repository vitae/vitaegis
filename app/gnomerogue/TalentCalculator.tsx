'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { Talent, Tree } from './talents';
import { talentText } from './talent-text';
import {
  add,
  available,
  colorSegments,
  decode,
  encode,
  fromRanks,
  levelFor,
  orderGroups,
  pointsLeft,
  prereqIndex,
  prereqMissing,
  readBuildParam,
  remove,
  requiredLevel,
  resetTree,
  tierUnlocked,
  totalPoints,
  treePoints,
  MAX_POINTS,
  TIER_POINTS,
  type Build,
} from './talent-build';

const ROWS = 7;
const COLS = 4;
const CELL = 44;
const GAP = 14;
const PAD = 12;
const HEAD = 16;
const SHAFT = 6;

const icon = (name: string) => `/gnomerogue/icons/${name}.jpg`;
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const treeIcons: Record<string, string> = {
  Assassination: 'ability_rogue_eviscerate',
  Combat: 'ability_backstab',
  Subtlety: 'ability_stealth',
};

export type Preset = { name: string; build: Tree[] };

type Props = { trees: Tree[]; presets: Preset[]; tavernUrl: string };

type Key = `${number}:${number}`;
const keyOf = (tree: number, idx: number): Key => `${tree}:${idx}`;

type Tip = {
  name: string;
  rank: number;
  max: number;
  header: string[][];
  requires: string[];
  description: string;
  next: string | null;
  footer: { kind: 'learn' | 'locked'; text: string }[];
};

function cellCorner(row: number, col: number) {
  return { x: PAD + col * (CELL + GAP), y: PAD + row * (CELL + GAP) };
}

function Arrow({ from, to, lit }: { from: Talent; to: Talent; lit: boolean }) {
  const sameRow = to.tier === from.tier;
  const sameCol = to.col === from.col;
  const goesLeft = to.col < from.col;

  let hw = 0;
  if (!sameCol) {
    hw = GAP;
    if (!sameRow) hw += CELL / 2 - SHAFT / 2;
  }
  let vh = 0;
  if (!sameRow) {
    vh = GAP;
    if (!sameCol) vh += CELL / 2 - SHAFT + HEAD / 2;
    vh += (CELL + GAP) * (to.tier - from.tier - 1);
  }

  const fc = cellCorner(from.tier, from.col);
  const hx = fc.x + (goesLeft ? -hw : CELL);
  const hy = fc.y + CELL / 2 - SHAFT / 2;
  const base = cellCorner(from.tier, to.col);
  const tc = cellCorner(to.tier, to.col);
  const color = lit ? 'bg-vitae-green' : 'bg-white/20';
  const orientation = sameRow ? (goesLeft ? 'left' : 'right') : 'bottom';
  const headX = tc.x + CELL / 2 - HEAD / 2 + (orientation === 'right' ? -CELL / 2 : orientation === 'left' ? CELL / 2 : 0);
  const headY = tc.y - HEAD / 2 + (orientation === 'bottom' ? 0 : CELL / 2);
  const headColor = lit ? 'border-t-vitae-green' : 'border-t-white/20';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {hw > 0 && <span className={`absolute ${color}`} style={{ left: hx, top: hy, width: hw, height: SHAFT }} />}
      {vh > 0 && (
        <span
          className={`absolute ${color}`}
          style={{ left: base.x + CELL / 2 - SHAFT / 2, top: base.y + (sameCol ? CELL : CELL / 2 + SHAFT / 2), width: SHAFT, height: vh }}
        />
      )}
      <span
        className={`absolute h-0 w-0 border-x-[8px] border-t-[10px] border-x-transparent ${headColor}`}
        style={{
          left: headX,
          top: headY,
          transform: orientation === 'left' ? 'rotate(90deg)' : orientation === 'right' ? 'rotate(-90deg)' : undefined,
        }}
      />
    </div>
  );
}

function TooltipBody({ tip }: { tip: Tip }) {
  const text = (s: string) =>
    colorSegments(s).map((seg, i) => (
      <span key={i} style={seg.color ? { color: seg.color } : undefined}>
        {seg.text}
      </span>
    ));
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-base font-semibold text-white">{tip.name}</p>
        <p className="whitespace-nowrap text-sm text-white/70">
          Rank {tip.rank}/{tip.max}
        </p>
      </div>
      {tip.header.map((pair, i) => (
        <div key={i} className="flex justify-between text-sm text-white/70">
          <span>{pair[0]}</span>
          <span>{pair[1] ?? ''}</span>
        </div>
      ))}
      {tip.requires.map((r) => (
        <p key={r} className="text-sm text-white/70">
          {r}
        </p>
      ))}
      <p className="mt-2 whitespace-pre-line text-sm font-light leading-relaxed text-[#ffd100]">{text(tip.description)}</p>
      {tip.next && (
        <>
          <p className="mt-2 text-sm text-white/70">Next rank:</p>
          <p className="whitespace-pre-line text-sm font-light leading-relaxed text-[#ffd100]">{text(tip.next)}</p>
        </>
      )}
      {tip.footer.map((f) => (
        <p key={f.text} className={`mt-2 text-sm ${f.kind === 'learn' ? 'text-vitae-green' : 'text-red-400'}`}>
          {f.text}
        </p>
      ))}
    </>
  );
}

export default function TalentCalculator({ trees, presets, tavernUrl }: Props) {
  const [build, setBuild] = useState<Build>(() => fromRanks(trees, presets[0].build));
  const [hovered, setHovered] = useState<Key | null>(null);
  const [tip, setTip] = useState<{ tip: Tip; x: number; y: number; below: boolean } | null>(null);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const dirty = useRef(false);

  const encoded = useMemo(() => encode(trees, build), [trees, build]);

  useEffect(() => {
    const param = readBuildParam(window.location.hash);
    if (param !== null) setBuild(decode(trees, param));
  }, [trees]);

  useEffect(() => {
    const hash = encoded ? `#?t=${encoded}` : '';
    setShareUrl(`${window.location.origin}${window.location.pathname}${hash}`);
    if (dirty.current) window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
  }, [encoded]);

  const change = (next: Build | ((b: Build) => Build)) => {
    dirty.current = true;
    setBuild(next);
  };

  const buildTip = useCallback(
    (tree: number, idx: number, rank: number, withFooter: boolean): Tip => {
      const t = trees[tree].talents[idx];
      const txt = talentText[t.name];
      const shown = Math.max(rank, 1);
      const describe = (r: number) => txt?.descriptions[r - 1] ?? txt?.descriptions[0] ?? t.text;
      const tip: Tip = {
        name: t.name,
        rank: shown,
        max: t.max,
        header: txt?.header ?? [],
        requires: txt?.requires ?? [],
        description: describe(shown),
        next: rank > 0 && rank < t.max ? describe(rank + 1) : null,
        footer: [],
      };
      if (!withFooter) return tip;
      if (rank > 0 || available(trees, build, tree, idx)) {
        tip.footer.push({ kind: 'learn', text: rank < t.max ? 'Click to learn' : 'Right click to unlearn' });
        return tip;
      }
      if (!tierUnlocked(trees, build, tree, idx)) {
        tip.footer.push({ kind: 'locked', text: `Requires ${t.tier * TIER_POINTS} points in ${trees[tree].name}` });
      }
      const missing = prereqMissing(trees, build, tree, idx);
      if (missing > 0) {
        const p = trees[tree].talents[prereqIndex(trees, tree, idx)];
        tip.footer.push({ kind: 'locked', text: `Requires ${missing} point${missing === 1 ? '' : 's'} in ${p.name}` });
      }
      return tip;
    },
    [trees, build],
  );

  const showTip = (el: HTMLElement, tip: Tip) => {
    const r = el.getBoundingClientRect();
    const below = r.top < 260;
    setTip({ tip, x: Math.min(r.right + 6, window.innerWidth - 300), y: below ? r.bottom + 6 : r.top - 6, below });
  };

  const onEnter = (tree: number, idx: number) => (e: SyntheticEvent<HTMLElement>) => {
    setHovered(keyOf(tree, idx));
    showTip(e.currentTarget, buildTip(tree, idx, build.alloc[tree][idx], true));
  };
  const onLeave = () => {
    setHovered(null);
    setTip(null);
  };

  const applyPreset = (p: Preset) => change(fromRanks(trees, p.build));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2000);
  };

  const groups = orderGroups(build);
  const left = pointsLeft(trees, build);
  const level = requiredLevel(trees, build);
  const split = trees.map((_, i) => treePoints(trees, build, i));
  const activePreset =
    presets.find((p) => p.build.every((tree, ti) => tree.talents.every((t, i) => t.rank === build.alloc[ti][i])))?.name ?? null;

  return (
    <section className="mt-12">
      <h2 className={`${label} text-center`}>Talent calculator</h2>
      <p className="mt-2 text-center text-sm font-light text-white/50">
        Click a talent to learn it, right click to unlearn. The link saves your build, and it opens in the Warcraft Tavern calculator too.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {presets.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activePreset === p.name
                ? 'border-vitae-green bg-vitae-green/15 text-vitae-green'
                : 'border-white/20 text-white/60 hover:border-vitae-green/60 hover:text-white'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => change({ alloc: trees.map((t) => t.talents.map(() => 0)), order: [] })}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:border-red-400/60 hover:text-white"
        >
          Clear
        </button>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-vitae-green/25 bg-white/[0.03] p-4 backdrop-blur-lg sm:grid-cols-[auto_auto_1fr] sm:items-center sm:gap-6">
        <p className="text-sm text-white/70">
          Points left <span className="ml-1 text-xl font-light text-white">{left}</span>
        </p>
        <p className="text-sm text-white/70">
          Required level <span className="ml-1 text-xl font-light text-white">{level}</span>
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Share link for this build"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white/70 outline-none focus:border-vitae-green/60"
          />
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-vitae-green/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-vitae-green transition hover:bg-vitae-green/15"
          >
            {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Failed' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-4xl font-light tracking-[0.1em] text-white">{split.join(' / ')}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {trees.map((tree, ti) => (
          <div key={tree.name} className="mx-auto w-full max-w-[280px] rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg">
            <div className="flex h-14 items-center justify-between border-b border-vitae-green/25 px-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon(treeIcons[tree.name] ?? tree.talents[0].icon)} alt="" width={24} height={24} className="rounded border border-vitae-green/40" />
                <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-white">{tree.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-vitae-green">{split[ti]}</span>
                <button
                  type="button"
                  onClick={() => change(resetTree(trees, build, ti))}
                  title={`Reset ${tree.name}`}
                  aria-label={`Reset ${tree.name}`}
                  className="grid h-6 w-6 place-items-center rounded-full border border-white/20 text-xs text-white/50 transition hover:border-red-400 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="relative mx-auto" style={{ width: PAD * 2 + COLS * CELL + (COLS - 1) * GAP, height: PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP }}>
              {tree.talents.map((t, idx) => {
                const p = prereqIndex(trees, ti, idx);
                if (p < 0) return null;
                return <Arrow key={`${t.name}-arrow`} from={tree.talents[p]} to={t} lit={available(trees, build, ti, idx) || build.alloc[ti][idx] > 0} />;
              })}
              {tree.talents.map((t, idx) => {
                const rank = build.alloc[ti][idx];
                const open = rank > 0 || available(trees, build, ti, idx);
                const maxed = rank === t.max;
                const k = keyOf(ti, idx);
                return (
                  <button
                    key={t.name}
                    type="button"
                    aria-label={`${t.name}, ${rank} of ${t.max}`}
                    onClick={() => change((b) => add(trees, b, ti, idx))}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      change((b) => remove(trees, b, ti, idx));
                    }}
                    onMouseEnter={onEnter(ti, idx)}
                    onMouseLeave={onLeave}
                    onFocus={onEnter(ti, idx)}
                    onBlur={onLeave}
                    className={`absolute rounded-md border outline-none transition ${
                      hovered === k ? 'ring-2 ring-white/70' : ''
                    } ${maxed ? 'border-[#ffd100]' : open ? 'border-vitae-green' : 'border-white/15'}`}
                    style={{ left: cellCorner(t.tier, t.col).x, top: cellCorner(t.tier, t.col).y, width: CELL, height: CELL }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon(t.icon)}
                      alt=""
                      width={CELL}
                      height={CELL}
                      draggable={false}
                      className={`h-full w-full rounded-md object-cover ${open ? '' : 'opacity-30 grayscale'}`}
                    />
                    <span
                      className={`absolute -bottom-1.5 -right-1.5 rounded border bg-black px-1 text-[10px] font-semibold leading-4 ${
                        maxed ? 'border-[#ffd100] text-[#ffd100]' : open ? 'border-vitae-green text-vitae-green' : 'border-white/20 text-white/40'
                      }`}
                    >
                      {rank}/{t.max}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-vitae-green/25 bg-white/[0.03] p-5 backdrop-blur-lg">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-white">Talent order</h3>
          <span className={label}>
            {totalPoints(trees, build)} of {MAX_POINTS}
          </span>
        </div>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm font-light text-white/50">No talents yet. Click a talent above or pick a build.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {groups.map((g, i) => {
              const t = trees[g.tree].talents[g.idx];
              const k = keyOf(g.tree, g.idx);
              return (
                <div
                  key={`${k}-${i}`}
                  onMouseEnter={(e) => {
                    setHovered(k);
                    showTip(e.currentTarget, buildTip(g.tree, g.idx, g.rank, false));
                  }}
                  onMouseLeave={onLeave}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${
                    hovered === k ? 'border-white/70 bg-white/10' : 'border-white/15'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon(t.icon)} alt={t.name} width={22} height={22} className="rounded border border-vitae-green/40" />
                  <span className="text-white/80">{g.levelEnd > g.levelStart ? `${g.levelStart} - ${g.levelEnd}` : g.levelStart}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs font-light text-white/40">
          Level {levelFor(1)} is the first point and level {levelFor(MAX_POINTS)} the last.{' '}
          <a href={`${tavernUrl}#?t=${encoded}`} target="_blank" rel="noopener noreferrer" className="underline decoration-vitae-green/40 underline-offset-4 hover:text-vitae-green">
            Open this build in the Warcraft Tavern calculator
          </a>
          .
        </p>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[290px] max-w-[calc(100vw-16px)] rounded-xl border border-vitae-green/60 bg-black/95 p-4 text-left shadow-[0_0_30px_rgba(0,255,0,0.25)]"
          style={{ left: Math.max(8, tip.x), top: tip.y, transform: tip.below ? undefined : 'translateY(-100%)' }}
        >
          <TooltipBody tip={tip.tip} />
        </div>
      )}
    </section>
  );
}
