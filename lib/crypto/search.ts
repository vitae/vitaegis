// Time search over Chainlink rounds. Pure: the round reader is injected, so the search
// can be tested against a fake feed without an RPC.

export interface RoundPoint {
  /** Aggregator round number inside one phase (1, 2, 3 …). */
  round: number;
  /** Unix seconds the answer was written. */
  updatedAt: number;
  /** Price in USD. */
  answer: number;
}

/** Reads rounds by number; a round that does not exist or fails to load comes back null. */
export type RoundReader = (rounds: number[]) => Promise<(RoundPoint | null)[]>;

/**
 * For each target time, the last round in [first, last] written at or before it, i.e. the
 * price the feed showed at that moment.
 *
 * All targets are searched together and share what they learn: every round read goes
 * into one sorted list, and each target brackets itself with the tightest known rounds on
 * either side. With hundreds of nearby targets (a year of daily closes) a probe made for
 * one day narrows its neighbours too, so the whole set converges in a handful of batches.
 * Steps alternate between interpolation (rounds land roughly evenly in time) and
 * bisection (which guarantees progress). Targets before the first round return null;
 * targets after the last return the last.
 */
export async function lastRoundsAtOrBefore(
  read: RoundReader,
  first: RoundPoint,
  last: RoundPoint,
  targets: number[],
  maxSteps = 60,
): Promise<(RoundPoint | null)[]> {
  const out: (RoundPoint | null)[] = targets.map(() => null);
  // Rounds are written in time order, so sorting by round also sorts by time.
  let known: RoundPoint[] = [first, last];
  const knownRounds = new Set([first.round, last.round]);
  // Per-target upper caps from rounds that failed to read: treated as "after" that target,
  // so a failure can only make the answer earlier, never from the future.
  const cap = new Map<number, number>();

  const open: number[] = [];
  targets.forEach((t, i) => {
    if (t < first.updatedAt) out[i] = null;
    else if (t >= last.updatedAt) out[i] = last;
    else open.push(i);
  });

  /** Tightest known rounds with lo.updatedAt <= t < hi.updatedAt. */
  const bracket = (t: number, i: number) => {
    let a = 0;
    let b = known.length - 1; // known[a] <= t < known[b] holds throughout
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (known[m].updatedAt <= t) a = m;
      else b = m;
    }
    const lo = known[a];
    let hi = known[b];
    const c = cap.get(i);
    if (c !== undefined && c < hi.round) hi = { round: c, updatedAt: t + 1, answer: hi.answer };
    return { lo, hi };
  };

  for (let step = 0; step < maxSteps; step++) {
    const probes = new Map<number, number>(); // target index -> round to read
    for (const i of open) {
      const t = targets[i];
      const { lo, hi } = bracket(t, i);
      const span = hi.round - lo.round;
      if (span <= 1) continue;
      let mid =
        step % 2 === 0 && hi.updatedAt > lo.updatedAt
          ? lo.round + Math.round(((t - lo.updatedAt) / (hi.updatedAt - lo.updatedAt)) * span)
          : lo.round + Math.floor(span / 2);
      mid = Math.min(hi.round - 1, Math.max(lo.round + 1, mid));
      probes.set(i, mid);
    }
    if (!probes.size) break;

    const unique = [...new Set(probes.values())].filter((r) => !knownRounds.has(r));
    const points = unique.length ? await read(unique) : [];
    const failed = new Set<number>();
    unique.forEach((r, k) => {
      const p = points[k];
      if (p) {
        known.push(p);
        knownRounds.add(r);
      } else failed.add(r);
    });
    known = known.sort((x, y) => x.round - y.round);
    for (const [i, r] of probes) {
      if (failed.has(r)) cap.set(i, Math.min(cap.get(i) ?? Infinity, r));
    }
  }

  for (const i of open) out[i] = bracket(targets[i], i).lo;
  return out;
}
