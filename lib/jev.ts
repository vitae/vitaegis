// TypeSafe Jev: a System One model. It does not write text; it takes state plus typed
// questions and returns calibrated answers in one parallel pass (~70-500ms).
// Verified against docs.typesafe.ai/api.md and /models.md on 2026-09-23 (jev-1.13.0).
// Plain fetch instead of @typesafe-ai/sdk, which needs Node 20 while this repo allows 18.
// Server-only: the key must never reach the browser.

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

/** Pin a versioned id (e.g. jev-1.13.0) once thresholds are tuned; the alias moves on release. */
export const JEV_MODEL = process.env.TYPESAFE_MODEL || 'jev-latest';

export const jevConfigured = () => Boolean(process.env.TYPESAFE_API_KEY);

type Rubric = string | Record<string, unknown> | unknown[];

export type JevQuestion =
  | { type: 'noul'; instructions: Rubric; criteria?: { true?: Rubric; false?: Rubric } }
  | { type: 'choice'; instructions: Rubric; criteria: Record<string, Rubric | null> }
  | { type: 'score'; instructions: Rubric; criteria: Rubric[] };

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}
export interface ChoiceAnswer<K extends string = string> {
  type: 'choice';
  choice: K;
  probabilities: Record<K, number>;
  confidence: number;
}
export interface ScoreAnswer {
  type: 'score';
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

type AnswerFor<Q> = Q extends { type: 'noul' }
  ? NoulAnswer
  : Q extends { type: 'choice'; criteria: infer C }
    ? ChoiceAnswer<Extract<keyof C, string>>
    : ScoreAnswer;

export interface JevResult<Q extends Record<string, JevQuestion>> {
  model: string;
  answers: { [K in keyof Q]: AnswerFor<Q[K]> };
  usage: { input_tokens: number; output_tokens: number };
}

export const noul = (instructions: Rubric, criteria?: { true?: Rubric; false?: Rubric }) =>
  ({ type: 'noul', instructions, ...(criteria ? { criteria } : {}) }) as const;

export const choice = <C extends Record<string, Rubric | null>>(
  instructions: Rubric,
  criteria: C,
) => ({ type: 'choice', instructions, criteria }) as const;

export const score = (instructions: Rubric, criteria: Rubric[]) =>
  ({ type: 'score', instructions, criteria }) as const;

/**
 * Ask every question against one state in a single request. Questions run in parallel
 * and cannot see each other's answers. Retries 429/529 with backoff, as the docs ask.
 */
export async function askJev<Q extends Record<string, JevQuestion>>(
  state: string | Record<string, unknown> | unknown[],
  questions: Q,
  opts: { timeoutMs?: number } = {},
): Promise<JevResult<Q>> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error('TYPESAFE_API_KEY is not set');

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, model: JEV_MODEL, questions }),
      cache: 'no-store',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status === 529) && attempt < 3) {
      const after = Number(res.headers.get('retry-after'));
      await new Promise((r) => setTimeout(r, after > 0 ? after * 1000 : 500 * 2 ** attempt));
      continue;
    }
    throw new Error(`Jev failed: ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
}
