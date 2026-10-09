// Read-side helpers over the content pipeline tables. Writes live in the tools so each one
// can carry its own approval policy.
import { db, clip } from './db';

export const DAY = 24 * 60 * 60 * 1000;

export type PostStatus =
  | 'draft'
  | 'ready'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'rejected'
  | 'failed';

export interface PostSummary {
  id: string;
  status: string;
  created_at: string;
  published_at: string | null;
  media_kind: string | null;
  platforms: string[];
  caption: string;
  error: string | null;
  links: { platform: string; url: string | null }[];
  source: {
    origin: string;
    kind: string;
    note: string;
    topic?: string;
    pillar?: string;
    tenets?: string[];
  } | null;
}

export async function listPosts(opts: {
  status?: PostStatus | 'needs';
  limit?: number;
  q?: string;
}) {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  let query = db()
    .from('content_posts')
    .select(
      'id, status, created_at, published_at, media_kind, platforms, captions, error, results, ingest_id',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.status === 'needs') query = query.in('status', ['ready', 'draft', 'failed']);
  else if (opts.status) query = query.eq('status', opts.status);
  if (opts.q) query = query.ilike('captions->>default', `%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const ingestIds = [...new Set(rows.map((r) => r.ingest_id).filter(Boolean))] as string[];
  const ingests = ingestIds.length
    ? ((
        await db().from('content_ingest').select('id, origin, kind, note, meta').in('id', ingestIds)
      ).data ?? [])
    : [];
  const byId = new Map(ingests.map((i) => [i.id, i]));

  return rows.map((r): PostSummary => {
    const ingest = r.ingest_id ? byId.get(r.ingest_id) : undefined;
    const meta = (ingest?.meta ?? {}) as { topic?: string; pillar?: string; tenets?: string[] };
    return {
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      published_at: r.published_at,
      media_kind: r.media_kind,
      platforms: (r.platforms ?? []) as string[],
      caption: clip((r.captions as Record<string, string> | null)?.default, 300),
      error: r.error ? clip(r.error, 200) : null,
      links: Object.entries((r.results ?? {}) as Record<string, { url?: string }>)
        .filter(([k, v]) => k !== 'drive' && v && typeof v === 'object')
        .map(([platform, v]) => ({ platform, url: v.url ?? null })),
      source: ingest
        ? {
            origin: ingest.origin,
            kind: ingest.kind,
            note: clip(ingest.note, 200),
            topic: meta.topic,
            pillar: meta.pillar,
            tenets: meta.tenets,
          }
        : null,
    };
  });
}

export async function counts() {
  const head = (table: string) => db().from(table).select('*', { head: true, count: 'exact' });
  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const [
    needsReview,
    drafting,
    published7,
    failed,
    jobsQueued,
    jobsRunning,
    jobsFailed,
    briefsReady,
  ] = await Promise.all([
    n(head('content_posts').eq('status', 'ready')),
    n(head('content_posts').in('status', ['draft', 'approved', 'publishing'])),
    n(head('content_posts').eq('status', 'published').gte('published_at', since7)),
    n(head('content_posts').eq('status', 'failed')),
    n(head('content_jobs').eq('state', 'queued')),
    n(head('content_jobs').eq('state', 'running')),
    n(head('content_jobs').eq('state', 'failed')),
    n(head('research_briefs').eq('status', 'ready')),
  ]);
  return {
    posts: { needsReview, drafting, published7, failed },
    jobs: { queued: jobsQueued, running: jobsRunning, failed: jobsFailed },
    research: { briefsReady },
  };
}

export async function failedJobs(limit = 10) {
  const { data } = await db()
    .from('content_jobs')
    .select('id, kind, error, attempts, max_attempts, updated_at, post_id, ingest_id')
    .eq('state', 'failed')
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((j) => ({ ...j, error: j.error ? clip(j.error, 240) : null }));
}
