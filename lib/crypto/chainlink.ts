// Server-only. Reads Chainlink USD price feeds on Ethereum mainnet over JSON-RPC: full
// history for BTC/USD, latest answers for the altcoin watchlist.
// Docs: docs.chain.link/data-feeds/historical-data and /data-feeds/price-feeds/addresses.
//
// The proxy's round id is (phaseId << 64) | aggregatorRound. Each phase is one aggregator
// contract; rounds inside a phase are numbered 1, 2, 3 … with no gaps, which is what makes
// a time search over them possible. The feed writes a new round on a 0.5% move or at
// least once an hour.

import { lastRoundsAtOrBefore, type RoundPoint } from './search';

/** BTC / USD proxy, Ethereum mainnet. */
export const BTC_USD_FEED = '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c';
const DECIMALS = 8;

const SEL_LATEST = '0xfeaf968c'; // latestRoundData()
const SEL_ROUND = '0x9a6fc8f5'; // getRoundData(uint80)

// ETH_RPC_URL (Alchemy, Infura, QuickNode …) goes first when set; the public endpoints are
// the fallback. Each endpoint has its own batch cap: free tiers reject big batches.
const RPCS: { url: string; batch: number }[] = [
  ...(process.env.ETH_RPC_URL ? [{ url: process.env.ETH_RPC_URL, batch: 50 }] : []),
  { url: 'https://ethereum-rpc.publicnode.com', batch: 40 },
  { url: 'https://eth.drpc.org', batch: 3 },
];
const CONCURRENCY = 2;
const RETRIES = 4;
const TIMEOUT_MS = 12_000;

interface RpcReply {
  id: number;
  result?: string;
  error?: unknown;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, body: unknown): Promise<RpcReply[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      // Public endpoints sit behind bot filters that refuse requests with no agent.
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'vitaegis.com/crypto' },
      body: JSON.stringify(body),
      // Cached briefly rather than no-store: a no-store fetch would turn /crypto into a
      // page rendered on every visit instead of once every five minutes.
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Rate limited: back off and try the same endpoint again before moving on.
    if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
      await sleep(500 * 2 ** attempt + Math.random() * 250);
      continue;
    }
    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('RPC did not answer the batch');
    return json as RpcReply[];
  }
}

/** A revert means "no such round" and is an answer; anything else is worth retrying. */
const isRevert = (e: unknown) => /revert/i.test(JSON.stringify(e ?? ''));

/** Run the calls on one endpoint; returns the indexes that still need an answer. */
async function callOn(
  rpc: { url: string; batch: number },
  to: (k: number) => string,
  datas: string[],
  idx: number[],
  out: (string | null)[],
): Promise<number[]> {
  const pending: number[] = [];
  for (let i = 0; i < idx.length; i += rpc.batch) {
    const part = idx.slice(i, i + rpc.batch);
    const replies = await post(
      rpc.url,
      part.map((k) => ({
        jsonrpc: '2.0',
        id: k,
        method: 'eth_call',
        params: [{ to: to(k), data: datas[k] }, 'latest'],
      })),
    );
    const seen = new Set<number>();
    for (const r of replies) {
      seen.add(r.id);
      if (typeof r.result === 'string' && r.result.length > 2) out[r.id] = r.result;
      else if (r.error && !isRevert(r.error)) pending.push(r.id); // rate limit inside a batch
    }
    // Free endpoints sometimes drop items from a batch reply without saying why.
    for (const k of part) if (!seen.has(k)) pending.push(k);
  }
  return pending;
}

let calls = 0;
/** eth_calls made by this process, for logging the cost of a refresh. */
export const rpcCallCount = () => calls;

/**
 * eth_call each calldata against a feed (one address for all, or one per call). A reverted
 * call (no such round) returns null; a call no endpoint would answer also ends up null.
 */
async function ethCalls(
  datas: string[],
  address: string | string[] = BTC_USD_FEED,
): Promise<(string | null)[]> {
  const to = (k: number) => (Array.isArray(address) ? address[k] : address);
  calls += datas.length;
  const out: (string | null)[] = new Array(datas.length).fill(null);
  const size = RPCS[0].batch;
  const chunks: number[][] = [];
  for (let i = 0; i < datas.length; i += size)
    chunks.push(Array.from({ length: Math.min(size, datas.length - i) }, (_, k) => i + k));

  const runChunk = async (idx: number[]) => {
    let pending = idx;
    let lastErr: unknown;
    let answered = false;
    for (const rpc of RPCS) {
      // Each endpoint gets two passes at whatever is still unanswered.
      for (let pass = 0; pass < 2 && pending.length; pass++) {
        try {
          pending = await callOn(rpc, to, datas, pending, out);
          answered = true;
          if (pending.length) await sleep(400 * (pass + 1));
        } catch (err) {
          lastErr = err;
          break;
        }
      }
      if (!pending.length) return;
    }
    if (!answered)
      throw lastErr instanceof Error ? lastErr : new Error('Every Ethereum RPC failed');
  };

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    await Promise.all(chunks.slice(i, i + CONCURRENCY).map(runChunk));
  }
  return out;
}

const word = (hex: string, n: number) => BigInt(`0x${hex.slice(2 + n * 64, 2 + (n + 1) * 64)}`);

interface Decoded {
  phase: number;
  round: number;
  point: RoundPoint;
}

function decode(hex: string | null): Decoded | null {
  if (!hex || hex.length < 2 + 64 * 5) return null;
  const roundId = word(hex, 0);
  const answer = word(hex, 1);
  const updatedAt = Number(word(hex, 3));
  if (!updatedAt || answer <= BigInt(0)) return null;
  const phase = Number(roundId >> BigInt(64));
  const round = Number(roundId & ((BigInt(1) << BigInt(64)) - BigInt(1)));
  return {
    phase,
    round,
    point: { round, updatedAt, answer: Number(answer) / 10 ** DECIMALS },
  };
}

const roundCall = (phase: number, round: number) =>
  SEL_ROUND + ((BigInt(phase) << BigInt(64)) | BigInt(round)).toString(16).padStart(64, '0');

async function readRounds(phase: number, rounds: number[]): Promise<(RoundPoint | null)[]> {
  const hex = await ethCalls(rounds.map((r) => roundCall(phase, r)));
  return hex.map((h) => decode(h)?.point ?? null);
}

export interface Latest extends RoundPoint {
  phase: number;
}

/**
 * Latest answer of several feeds in one batch. Null for a feed that does not answer
 * (retired, or a wrong address). Every USD feed used here has 8 decimals.
 */
export async function latestFeeds(addresses: string[]): Promise<(Latest | null)[]> {
  const hex = await ethCalls(
    addresses.map(() => SEL_LATEST),
    addresses,
  );
  return hex.map((h) => {
    const d = decode(h);
    return d ? { ...d.point, phase: d.phase } : null;
  });
}

export async function latestBtc(): Promise<Latest> {
  const [hex] = await ethCalls([SEL_LATEST]);
  const d = decode(hex);
  if (!d) throw new Error('Chainlink returned no BTC/USD answer');
  return { ...d.point, phase: d.phase };
}

interface Phase {
  phase: number;
  first: RoundPoint;
  last: RoundPoint;
}

/** The last round of a finished phase: double until a round is missing, then bisect. */
async function lastRoundOf(phase: number): Promise<RoundPoint | null> {
  const powers = Array.from({ length: 24 }, (_, k) => 2 ** k);
  const probes = await readRounds(phase, powers);
  let k = probes.findIndex((p) => !p);
  if (k === 0) return null;
  if (k === -1) k = powers.length;
  let lo = probes[k - 1]!;
  let hi = 2 ** k;
  while (hi - lo.round > 1) {
    const mid = lo.round + Math.floor((hi - lo.round) / 2);
    const [p] = await readRounds(phase, [mid]);
    if (p) lo = p;
    else hi = mid;
  }
  return lo;
}

/** A price plus the feed phase and round it came from. */
export interface PricePoint extends RoundPoint {
  phase: number;
}

/**
 * The price the feed showed at each unix time, newest phase first and older phases only
 * when a target reaches back before the current one. Null where the feed has no history.
 */
export async function btcPricesAt(
  times: number[],
  latest?: Latest,
): Promise<(PricePoint | null)[]> {
  const now = latest ?? (await latestBtc());
  const [first] = await readRounds(now.phase, [1]);
  if (!first) throw new Error(`Chainlink phase ${now.phase} has no first round`);
  const phases: Phase[] = [{ phase: now.phase, first, last: now }];

  const earliest = Math.min(...times);
  while (earliest < phases[phases.length - 1].first.updatedAt) {
    const p = phases[phases.length - 1].phase - 1;
    if (p < 1) break;
    const [f] = await readRounds(p, [1]);
    const l = f ? await lastRoundOf(p) : null;
    if (!f || !l) break;
    phases.push({ phase: p, first: f, last: l });
  }

  const out: (PricePoint | null)[] = times.map(() => null);
  for (const ph of phases) {
    const idx = times
      .map((t, i) => ({ t, i }))
      .filter(({ t, i }) => out[i] === null && t >= ph.first.updatedAt);
    if (!idx.length) continue;
    const found = await lastRoundsAtOrBefore(
      (rounds) => readRounds(ph.phase, rounds),
      ph.first,
      ph.last,
      idx.map((x) => x.t),
    );
    idx.forEach(({ i }, k) => {
      const p = found[k];
      out[i] = p ? { ...p, phase: ph.phase } : null;
    });
  }
  return out;
}

/** Every BTC round from `from` to `to` inside one phase, oldest first. */
export async function btcRounds(phase: number, from: number, to: number): Promise<RoundPoint[]> {
  const rounds = Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);
  const points = await readRounds(phase, rounds);
  return points.filter((p): p is RoundPoint => Boolean(p));
}

/** The most recent `count` rounds of the current phase, oldest first: intraday detail. */
export async function recentRounds(count: number, latest?: Latest): Promise<RoundPoint[]> {
  const now = latest ?? (await latestBtc());
  const from = Math.max(1, now.round - count + 1);
  const rounds = Array.from({ length: now.round - from + 1 }, (_, k) => from + k);
  const points = await readRounds(now.phase, rounds);
  return points.filter((p): p is RoundPoint => Boolean(p));
}
