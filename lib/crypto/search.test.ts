import { describe, expect, it } from 'vitest';
import { lastRoundsAtOrBefore, type RoundPoint } from './search';

// A fake feed: 5,000 rounds at irregular times (bursts and hour-long gaps), like a real one.
const rounds: RoundPoint[] = [];
let t = 1_700_000_000;
for (let r = 1; r <= 5000; r++) {
  t += r % 7 === 0 ? 3600 : 60 + ((r * 37) % 900);
  rounds.push({ round: r, updatedAt: t, answer: 50_000 + r });
}
const byRound = new Map(rounds.map((p) => [p.round, p]));

function reader() {
  let calls = 0;
  let batches = 0;
  return {
    read: async (rs: number[]) => {
      batches++;
      calls += rs.length;
      return rs.map((r) => byRound.get(r) ?? null);
    },
    stats: () => ({ calls, batches }),
  };
}

const truth = (target: number) => {
  let best: RoundPoint | null = null;
  for (const p of rounds) if (p.updatedAt <= target) best = p;
  return best;
};

describe('lastRoundsAtOrBefore', () => {
  const first = rounds[0];
  const last = rounds[rounds.length - 1];

  it('finds the exact round for many targets at once', async () => {
    const targets = Array.from(
      { length: 200 },
      (_, i) => first.updatedAt + Math.floor(((last.updatedAt - first.updatedAt) * i) / 199),
    );
    const { read, stats } = reader();
    const found = await lastRoundsAtOrBefore(read, first, last, targets);
    targets.forEach((target, i) => expect(found[i]?.round).toBe(truth(target)?.round));
    // Batched: the step count, not the target count, sets the number of round trips.
    expect(stats().batches).toBeLessThan(30);
  });

  it('handles targets on a round boundary, before the first and after the last', async () => {
    const { read } = reader();
    const found = await lastRoundsAtOrBefore(read, first, last, [
      rounds[2499].updatedAt,
      rounds[2499].updatedAt - 1,
      first.updatedAt - 10,
      last.updatedAt + 10,
    ]);
    expect(found[0]?.round).toBe(2500);
    expect(found[1]?.round).toBe(2499);
    expect(found[2]).toBeNull();
    expect(found[3]?.round).toBe(5000);
  });

  it('never returns a round from after the target when reads fail', async () => {
    const flaky = async (rs: number[]) => rs.map((r) => (r % 3 === 0 ? null : byRound.get(r)!));
    const target = rounds[3333].updatedAt + 5;
    const [p] = await lastRoundsAtOrBefore(flaky, first, last, [target]);
    expect(p!.updatedAt).toBeLessThanOrEqual(target);
  });
});
