// YouTube autopilot: plans a Short on a schedule, lets the existing pipeline write and
// render it, then publishes it without a human in the loop once it passes a screen.
//
//   cron /api/content/autopilot (hourly)  -> planNext() queues a text ingest
//   cron /api/content/worker (2 min)      -> caption -> video -> video_poll
//   video ready                           -> maybeAutoPublish() -> screen -> publish
//
// Env:
//   AUTOPILOT_ENABLED=true            master switch (off unless set)
//   AUTOPILOT_SHORTS_PER_DAY=4        1..6; YouTube's default quota fits about six uploads
//   AUTOPILOT_PLATFORMS=youtube       comma list: youtube,tiktok,instagram,facebook,twitter
import { supabaseAdmin } from './supabase';
import { pillars } from './pillars';
import { screenPost } from './google-ai';
import { PLATFORMS, type Platform } from './social/tokens';
import { autopilotNote, buildTopics, pickTopic, slotOpen } from './autopilot-topics';

/** How many past topics to keep out of rotation. */
const HISTORY = 120;

export function autopilotConfig() {
  const perDay = Math.min(6, Math.max(1, Number(process.env.AUTOPILOT_SHORTS_PER_DAY) || 4));
  const platforms = (process.env.AUTOPILOT_PLATFORMS || 'youtube')
    .split(',')
    .map((p) => p.trim())
    .filter((p): p is Platform => (PLATFORMS as string[]).includes(p));
  return {
    enabled: process.env.AUTOPILOT_ENABLED === 'true',
    perDay,
    platforms: platforms.length ? platforms : (['youtube'] as Platform[]),
  };
}

function db() {
  const client = supabaseAdmin();
  if (!client) throw new Error('Supabase is not configured');
  return client;
}

export interface PlanResult {
  queued: boolean;
  reason: string;
  topic?: string;
  ingestId?: string;
}

/** Queue the next Short if one is due. Safe to call as often as you like. */
export async function planNext(now = new Date()): Promise<PlanResult> {
  const cfg = autopilotConfig();
  if (!cfg.enabled) return { queued: false, reason: 'AUTOPILOT_ENABLED is not true' };

  const { data: history, error } = await db()
    .from('content_ingest')
    .select('created_at, meta')
    .eq('origin', 'autopilot')
    .order('created_at', { ascending: false })
    .limit(HISTORY);
  if (error) throw new Error(error.message);

  const rows = (history ?? []) as { created_at: string; meta: { topic?: string } | null }[];
  const times = rows.map((r) => new Date(r.created_at));
  if (!slotOpen(now, times, cfg.perDay)) {
    return { queued: false, reason: `not due yet (${cfg.perDay}/day, evenly spaced)` };
  }

  const recent = rows.map((r) => r.meta?.topic).filter(Boolean) as string[];
  const topic = pickTopic(buildTopics(pillars), recent, Math.floor(now.getTime() / 3_600_000));
  if (!topic) return { queued: false, reason: 'no topics in lib/pillars.ts' };

  const { data: ingest, error: iErr } = await db()
    .from('content_ingest')
    .insert({
      kind: 'text',
      origin: 'autopilot',
      note: autopilotNote(topic),
      status: 'queued',
      meta: { topic: topic.key, pillar: topic.pillar },
    })
    .select('id')
    .single();
  if (iErr || !ingest) throw new Error(iErr?.message ?? 'Could not create ingest');

  const { error: jErr } = await db()
    .from('content_jobs')
    .insert({ kind: 'caption', ingest_id: ingest.id, run_after: now.toISOString() });
  if (jErr) throw new Error(jErr.message);

  return { queued: true, reason: 'queued', topic: topic.key, ingestId: ingest.id };
}

/**
 * Called by the pipeline whenever a post becomes ready. Captured posts are left for
 * review as before; autopilot posts are screened and, if clean, queued to publish.
 * Never throws: a failure here leaves the post in review instead of failing the render.
 */
export async function maybeAutoPublish(postId: string): Promise<void> {
  try {
    if (!autopilotConfig().enabled) return;
    const { data: post } = await db()
      .from('content_posts')
      .select('id, status, captions, ingest_id')
      .eq('id', postId)
      .single();
    if (!post?.ingest_id || post.status !== 'ready') return;
    const { data: ingest } = await db()
      .from('content_ingest')
      .select('origin')
      .eq('id', post.ingest_id)
      .single();
    if (ingest?.origin !== 'autopilot') return;

    let verdict: { publish: boolean; reason: string };
    try {
      verdict = await screenPost((post.captions ?? {}) as Record<string, string>);
    } catch (err) {
      verdict = {
        publish: false,
        reason: `screen unavailable: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    const now = new Date().toISOString();

    if (!verdict.publish) {
      // Stays "ready" so it shows up on /admin/content for a human decision.
      await db()
        .from('content_posts')
        .update({ error: `Autopilot held: ${verdict.reason}`.slice(0, 1000), updated_at: now })
        .eq('id', postId);
      console.warn(`autopilot held post ${postId}: ${verdict.reason}`);
      return;
    }

    const { data: claimed } = await db()
      .from('content_posts')
      .update({ status: 'approved', approved_at: now, updated_at: now })
      .eq('id', postId)
      .eq('status', 'ready')
      .select('id')
      .single();
    if (!claimed) return; // someone acted on it first
    const { error } = await db()
      .from('content_jobs')
      .insert({ kind: 'publish', post_id: postId, run_after: now });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(`autopilot publish failed for ${postId}:`, err);
  }
}
