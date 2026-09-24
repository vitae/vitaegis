import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { adminAuthed } from '@/lib/admin-auth';
import { listAccounts, PLATFORMS } from '@/lib/social';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

/** Everything the dashboard shows: queue, publishing history, per-platform tallies, job health. */
export async function GET(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const now = Date.now();
  const since7 = new Date(now - 7 * DAY).toISOString();
  const since30 = new Date(now - 30 * DAY).toISOString();

  const head = (table: string) => db.from(table).select('*', { head: true, count: 'exact' });
  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [
    needsReview,
    drafting,
    published,
    published7,
    published30,
    failed,
    rejected,
    jobsQueued,
    jobsRunning,
    jobsFailed,
    ingestTotal,
    sourcesDone,
    sourcesPending,
    findings,
    briefsReady,
  ] = await Promise.all([
    n(head('content_posts').eq('status', 'ready')),
    n(head('content_posts').in('status', ['draft', 'approved', 'publishing'])),
    n(head('content_posts').eq('status', 'published')),
    n(head('content_posts').eq('status', 'published').gte('published_at', since7)),
    n(head('content_posts').eq('status', 'published').gte('published_at', since30)),
    n(head('content_posts').eq('status', 'failed')),
    n(head('content_posts').eq('status', 'rejected')),
    n(head('content_jobs').eq('state', 'queued')),
    n(head('content_jobs').eq('state', 'running')),
    n(head('content_jobs').eq('state', 'failed')),
    n(head('content_ingest')),
    n(head('research_sources').eq('status', 'done')),
    n(head('research_sources').in('status', ['queued', 'extracting'])),
    n(head('research_findings')),
    n(head('research_briefs').eq('status', 'ready')),
  ]);

  // Per-platform tallies come from the results map on every published post.
  const { data: publishedRows } = await db
    .from('content_posts')
    .select('id, results, published_at, captions, media_kind')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(500);
  const perPlatform: Record<string, { total: number; last7: number; last30: number }> = {};
  for (const p of PLATFORMS) perPlatform[p] = { total: 0, last7: 0, last30: 0 };
  for (const row of publishedRows ?? []) {
    const at = row.published_at ?? '';
    for (const platform of Object.keys((row.results ?? {}) as Record<string, unknown>)) {
      if (platform === 'drive' || !perPlatform[platform]) continue;
      perPlatform[platform].total += 1;
      if (at >= since7) perPlatform[platform].last7 += 1;
      if (at >= since30) perPlatform[platform].last30 += 1;
    }
  }

  const recent = (publishedRows ?? []).slice(0, 8).map((row) => ({
    id: row.id,
    published_at: row.published_at,
    media_kind: row.media_kind,
    caption: String((row.captions as Record<string, string> | null)?.default ?? '').slice(0, 140),
    links: Object.entries((row.results ?? {}) as Record<string, { url?: string }>)
      .filter(([k, v]) => k !== 'drive' && v && typeof v === 'object')
      .map(([platform, v]) => ({ platform, url: v.url ?? null })),
  }));

  // Last worker activity: the newest job that changed state.
  const { data: lastJob } = await db
    .from('content_jobs')
    .select('kind, state, updated_at, error')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: failedJobs } = await db
    .from('content_jobs')
    .select('id, kind, error, updated_at, post_id, payload')
    .eq('state', 'failed')
    .order('updated_at', { ascending: false })
    .limit(10);

  const accounts = await listAccounts().catch(() => []);
  const cron = Boolean(process.env.CRON_SECRET);

  return NextResponse.json(
    {
      posts: {
        needsReview,
        drafting,
        published,
        published7,
        published30,
        failed,
        rejected,
        ingestTotal,
      },
      perPlatform,
      recent,
      jobs: {
        queued: jobsQueued,
        running: jobsRunning,
        failed: jobsFailed,
        last: lastJob ?? null,
        failedList: failedJobs ?? [],
      },
      research: { sourcesDone, sourcesPending, findings, briefsReady },
      accounts: PLATFORMS.map((p) => {
        const a = accounts.find((x) => x.platform === p);
        return {
          platform: p,
          connected: Boolean(a),
          name: a?.account_name ?? null,
          expires_at: a?.expires_at ?? null,
        };
      }),
      env: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        typesafe: Boolean(process.env.TYPESAFE_API_KEY),
        cron,
        drive: Boolean(process.env.GDRIVE_FOLDER_ID),
        mediaSecret: Boolean(process.env.CONTENT_MEDIA_SECRET || process.env.CONTENT_INGEST_SECRET),
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
