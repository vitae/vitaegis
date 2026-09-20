// Content pipeline: capture -> generate -> review -> publish.
// Every stage is a row in content_jobs. The cron worker advances a few jobs per tick,
// so nothing depends on one request surviving a Veo render.

import { supabaseAdmin } from './supabase';
import { downloadVideo, generateImage, pollVideo, startVideo, writeCaptions, type Source } from './google-ai';
import { publish, type Platform } from './social';


const BUCKET = 'content';
/** Long enough for the publisher to fetch the media and for you to preview it. */
const SIGNED_URL_TTL = 60 * 60 * 24;

type JobKind = 'caption' | 'image' | 'video' | 'video_poll' | 'publish';

interface Job {
  id: string;
  post_id: string | null;
  ingest_id: string | null;
  kind: JobKind;
  attempts: number;
  max_attempts: number;
  operation_name: string | null;
  payload: Record<string, unknown>;
}

function db() {
  const client = supabaseAdmin();
  if (!client) throw new Error('Supabase is not configured');
  return client;
}

export async function queueJob(job: {
  kind: JobKind;
  postId?: string;
  ingestId?: string;
  operationName?: string;
  payload?: Record<string, unknown>;
  delaySeconds?: number;
}) {
  const runAfter = new Date(Date.now() + (job.delaySeconds ?? 0) * 1000).toISOString();
  const { error } = await db().from('content_jobs').insert({
    kind: job.kind,
    post_id: job.postId ?? null,
    ingest_id: job.ingestId ?? null,
    operation_name: job.operationName ?? null,
    payload: job.payload ?? {},
    run_after: runAfter,
  });
  if (error) throw new Error(error.message);
}

/** Read a stored object back as base64 so it can be handed to a model. */
async function sourceFrom(path: string | null, kind: string): Promise<Source | undefined> {
  if (!path) return undefined;
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) return undefined;
  const mimeType =
    data.type ||
    (kind === 'video' ? 'video/mp4' : kind === 'voice' ? 'audio/m4a' : 'image/jpeg');
  return { mimeType, base64: Buffer.from(await data.arrayBuffer()).toString('base64') };
}

async function store(path: string, bytes: Buffer, contentType: string) {
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(path: string) {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) throw new Error(error?.message ?? 'Could not sign media URL');
  return data.signedUrl;
}

// ── stages ──────────────────────────────────────────────────────────────────

/** Stage 1: read the captured item, write the copy, decide still vs clip. */
async function runCaption(job: Job) {
  const { data: ingest, error } = await db().from('content_ingest').select('*').eq('id', job.ingest_id!).single();
  if (error || !ingest) throw new Error('Ingest row is gone');

  const source = await sourceFrom(ingest.storage_path, ingest.kind);
  const captions = await writeCaptions(ingest.note ?? '', source);

  // A captured clip or an explicit request becomes video; everything else is a still.
  const wantsVideo = ingest.kind === 'video' || /\b(reel|video|clip)\b/i.test(ingest.note ?? '');
  const mediaKind = wantsVideo ? 'video' : 'image';

  const { data: post, error: pErr } = await db()
    .from('content_posts')
    .insert({
      ingest_id: ingest.id,
      status: 'draft',
      media_kind: mediaKind,
      captions: {
        default: captions.default,
        instagram: captions.instagram,
        facebook: captions.facebook,
        youtube: captions.youtube,
        tiktok: captions.tiktok,
        twitter: captions.twitter,
      },
    })
    .select()
    .single();
  if (pErr || !post) throw new Error(pErr?.message ?? 'Could not create post');

  await db().from('content_ingest').update({ status: 'done' }).eq('id', ingest.id);
  await queueJob({
    kind: mediaKind,
    postId: post.id,
    ingestId: ingest.id,
    payload: { prompt: wantsVideo ? captions.videoPrompt : captions.imagePrompt },
  });
}

/** Stage 2a: Nano Banana Pro still, using the captured photo as reference when there is one. */
async function runImage(job: Job) {
  const prompt = String(job.payload.prompt ?? '');
  const { data: post } = await db().from('content_posts').select('ingest_id').eq('id', job.post_id!).single();
  let source: Source | undefined;
  if (post?.ingest_id) {
    const { data: ingest } = await db()
      .from('content_ingest')
      .select('storage_path, kind')
      .eq('id', post.ingest_id)
      .single();
    if (ingest?.kind === 'photo') source = await sourceFrom(ingest.storage_path, ingest.kind);
  }
  const { bytes, mimeType } = await generateImage(prompt, { source, size: '2K' });
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
  const path = await store(`generated/${job.post_id}.${ext}`, bytes, mimeType);
  await db()
    .from('content_posts')
    .update({ media_path: path, media_url: await signedUrl(path), status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', job.post_id!);
}

/** Stage 2b: kick Veo off. The render is polled on later ticks. */
async function runVideo(job: Job) {
  const operationName = await startVideo(String(job.payload.prompt ?? ''));
  await queueJob({ kind: 'video_poll', postId: job.post_id!, operationName, delaySeconds: 30 });
}

async function runVideoPoll(job: Job) {
  const { done, uri, error } = await pollVideo(job.operation_name!);
  if (!done) {
    // Not an attempt: re-queue a fresh poll so retries stay reserved for real failures.
    await queueJob({ kind: 'video_poll', postId: job.post_id!, operationName: job.operation_name!, delaySeconds: 30 });
    return;
  }
  if (error || !uri) throw new Error(error ?? 'Veo returned no video');
  const path = await store(`generated/${job.post_id}.mp4`, await downloadVideo(uri), 'video/mp4');
  await db()
    .from('content_posts')
    .update({ media_path: path, media_url: await signedUrl(path), status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', job.post_id!);
}

/** Stage 4: fan out to the networks. Only ever queued by an explicit approval. */
async function runPublish(job: Job) {
  const { data: post, error } = await db().from('content_posts').select('*').eq('id', job.post_id!).single();
  if (error || !post) throw new Error('Post row is gone');
  if (post.status !== 'approved' && post.status !== 'publishing') {
    throw new Error(`Refusing to publish a post in state "${post.status}"`);
  }
  await db().from('content_posts').update({ status: 'publishing' }).eq('id', post.id);

  // Serve the media from our own domain: TikTok only pulls from a verified domain and
  // Instagram needs a plain URL it can cURL, so a Supabase signed URL will not do.
  const secret = process.env.CONTENT_MEDIA_SECRET || process.env.CONTENT_INGEST_SECRET;
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://vitaegis.com';
  const mediaUrl = post.media_path && secret ? `${base}/api/content/media/${post.id}?t=${secret}` : undefined;

  const priorResults = (post.results ?? {}) as Record<string, unknown>;
  const { results, failures } = await publish({
    captions: post.captions ?? {},
    mediaUrl,
    mediaKind: post.media_kind ?? 'none',
    platforms: (post.platforms ?? []) as Platform[],
    aiDisclosure: post.ai_disclosure ?? true,
    alreadyDone: Object.keys(priorResults),
  });

  const merged = { ...priorResults, ...results };
  const failed = Object.keys(failures);
  await db()
    .from('content_posts')
    .update({
      // Anything that landed is recorded, so a retry only picks up what did not.
      status: Object.keys(merged).length ? 'published' : 'failed',
      results: merged,
      error: failed.length ? failed.map((p) => `${p}: ${failures[p]}`).join(' | ').slice(0, 1000) : null,
      media_url: mediaUrl,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', post.id);

  if (failed.length && !Object.keys(results).length) {
    throw new Error(`Every platform failed: ${failed.map((p) => `${p}: ${failures[p]}`).join(' | ')}`);
  }
}

const STAGES: Record<JobKind, (job: Job) => Promise<void>> = {
  caption: runCaption,
  image: runImage,
  video: runVideo,
  video_poll: runVideoPoll,
  publish: runPublish,
};

/** Advance up to `limit` due jobs. Called by the cron worker. */
export async function runDueJobs(limit = 3) {
  const client = db();
  const { data: jobs } = await client
    .from('content_jobs')
    .select('*')
    .eq('state', 'queued')
    .lte('run_after', new Date().toISOString())
    .order('run_after', { ascending: true })
    .limit(limit);

  const done: { id: string; kind: string; ok: boolean; error?: string }[] = [];
  for (const raw of (jobs ?? []) as Job[]) {
    // Claim it first so an overlapping tick cannot pick up the same row.
    const { data: claimed } = await client
      .from('content_jobs')
      .update({ state: 'running', attempts: raw.attempts + 1, updated_at: new Date().toISOString() })
      .eq('id', raw.id)
      .eq('state', 'queued')
      .select()
      .single();
    if (!claimed) continue;

    try {
      await STAGES[raw.kind](raw);
      await client.from('content_jobs').update({ state: 'done', updated_at: new Date().toISOString() }).eq('id', raw.id);
      done.push({ id: raw.id, kind: raw.kind, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const spent = raw.attempts + 1 >= raw.max_attempts;
      await client
        .from('content_jobs')
        .update({
          state: spent ? 'failed' : 'queued',
          error: message.slice(0, 1000),
          // Back off 1, then 5 minutes before trying again.
          run_after: new Date(Date.now() + (raw.attempts + 1) * 60_000 * (raw.attempts ? 5 : 1)).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', raw.id);
      if (spent && raw.post_id) {
        await client.from('content_posts').update({ status: 'failed', error: message.slice(0, 1000) }).eq('id', raw.post_id);
      }
      if (spent && raw.ingest_id) {
        await client.from('content_ingest').update({ status: 'failed', error: message.slice(0, 1000) }).eq('id', raw.ingest_id);
      }
      console.error(`content job ${raw.kind} ${raw.id} failed:`, message);
      done.push({ id: raw.id, kind: raw.kind, ok: false, error: message });
    }
  }
  return done;
}
