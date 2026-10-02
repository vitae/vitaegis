// Topic planning for the YouTube autopilot. Pure functions, no I/O, so the schedule
// and rotation rules are testable without Supabase or a model.
import type { Pillar } from './pillars';

export interface Topic {
  /** Stable id used to avoid repeating a topic, e.g. "H-01:morning-light". */
  key: string;
  pillar: string;
  dossier: string;
  title: string;
  detail: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/** Every dossier entry on /health, /stealth and /wealth is one Short's worth of material. */
export function buildTopics(pillars: Pillar[]): Topic[] {
  const topics: Topic[] = [];
  for (const p of pillars) {
    for (const d of p.dossiers) {
      for (const e of d.entries) {
        topics.push({
          key: `${d.code}:${slug(e.k)}`,
          pillar: p.name,
          dossier: d.title,
          title: e.k,
          detail: e.v,
        });
      }
    }
  }
  return topics;
}

/**
 * Pick the next topic. Skips anything used recently, and moves to a different pillar
 * than the last post so the channel rotates Health, Stealth and Wealth. When every topic
 * has been used, the least recently used one comes back around.
 *
 * @param recent topic keys, most recent first
 * @param seed   any integer; the same inputs and seed always give the same pick
 */
export function pickTopic(topics: Topic[], recent: string[], seed: number): Topic | null {
  if (!topics.length) return null;
  const used = new Set(recent);
  const lastPillar = topics.find((t) => t.key === recent[0])?.pillar;
  const fresh = topics.filter((t) => !used.has(t.key));
  const pool = fresh.length
    ? fresh.filter((t) => t.pillar !== lastPillar).length
      ? fresh.filter((t) => t.pillar !== lastPillar)
      : fresh
    : // All used: the oldest key in the history is the one that has rested longest.
      topics.filter((t) => t.key === recent[recent.length - 1]);
  const list = pool.length ? pool : topics;
  return list[Math.abs(Math.trunc(seed)) % list.length];
}

/**
 * Is a new Short due? Caps the rolling 24 hours at `perDay` and spaces posts evenly so
 * they do not all land in the first hour after a deploy.
 *
 * @param recentTimes creation times of autopilot posts, any order
 */
export function slotOpen(now: Date, recentTimes: Date[], perDay: number): boolean {
  if (perDay <= 0) return false;
  const day = 24 * 60 * 60 * 1000;
  const inWindow = recentTimes.filter((t) => now.getTime() - t.getTime() < day);
  if (inWindow.length >= perDay) return false;
  const latest = Math.max(0, ...inWindow.map((t) => t.getTime()));
  // 90% of the even spacing, so an hourly cron that drifts a few minutes still fires.
  return now.getTime() - latest >= (day / perDay) * 0.9;
}

/** The note the existing caption stage reads. It asks for a generated vertical clip. */
export function autopilotNote(t: Topic): string {
  return [
    `Autopilot YouTube Short. Generate a vertical video that teaches one concrete, useful idea.`,
    `Pillar: ${t.pillar}. Dossier: ${t.dossier}.`,
    `Topic: ${t.title}. ${t.detail}`,
    `The title must make someone stop scrolling without overpromising. Stick to everyday habits;`,
    `no medical, cure or investment claims. End the description with a nudge to vitaegis.com.`,
  ].join('\n');
}
