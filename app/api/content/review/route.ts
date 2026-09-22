import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueJob, signedUrl } from '@/lib/pipeline';
import { listAccounts, PLATFORMS, type Platform } from '@/lib/social';
import { adminAuthed } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const PAGE = 30;

/**
 * Posts for the content screen, with filters and cursor pagination.
 *   ?status=ready|published|failed|rejected|draft|all   (default: all)
 *   ?platform=instagram                                  (posted-to or selected-for)
 *   ?q=text                                              (searches the default caption)
 *   ?before=<created_at iso>                             (next page)
 *   ?counts=1                                            (status tallies for the tabs)
 */
export async function GET(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') ?? 'all';
  const platform = sp.get('platform');
  const q = sp.get('q')?.trim();
  const before = sp.get('before');

  let query = db.from('content_posts').select('*').order('created_at', { ascending: false }).limit(PAGE + 1);
  if (status === 'needs') query = query.in('status', ['ready', 'draft', 'failed']);
  else if (status !== 'all') query = query.eq('status', status);
  if (platform && (PLATFORMS as string[]).includes(platform)) query = query.contains('platforms', [platform]);
  if (q) query = query.ilike('captions->>default', `%${q}%`);
  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);

  // What each post came from, and the last thing the worker did to it.
  const ingestIds = [...new Set(page.map((p) => p.ingest_id).filter(Boolean))] as string[];
  const postIds = page.map((p) => p.id) as string[];
  const [{ data: ingests }, { data: jobs }] = await Promise.all([
    ingestIds.length
      ? db.from('content_ingest').select('id, kind, note, captured_at').in('id', ingestIds)
      : Promise.resolve({ data: [] as { id: string; kind: string; note: string; captured_at: string }[] }),
    postIds.length
      ? db
          .from('content_jobs')
          .select('id, post_id, kind, state, attempts, max_attempts, error, run_after, updated_at')
          .in('post_id', postIds)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const ingestById = new Map((ingests ?? []).map((i) => [i.id, i]));
  const jobsByPost = new Map<string, unknown[]>();
  for (const j of (jobs ?? []) as { post_id: string }[]) {
    const list = jobsByPost.get(j.post_id) ?? [];
    if (list.length < 8) list.push(j);
    jobsByPost.set(j.post_id, list);
  }

  const posts = await Promise.all(
    page.map(async (p) => ({
      ...p,
      source: p.ingest_id ? ingestById.get(p.ingest_id) ?? null : null,
      jobs: jobsByPost.get(p.id) ?? [],
      // Signed URLs expire; hand the screen fresh ones each load, one per slide.
      media_urls: await Promise.all(
        ((p.media_paths?.length ? p.media_paths : p.media_path ? [p.media_path] : []) as string[]).map((path) =>
          signedUrl(path).catch(() => null),
        ),
      ).then((urls) => urls.filter(Boolean)),
    })),
  );

  let counts: Record<string, number> | undefined;
  if (sp.get('counts')) {
    const head = () => db.from('content_posts').select('*', { head: true, count: 'exact' });
    const n = async (qb: PromiseLike<{ count: number | null }>) => (await qb).count ?? 0;
    const [all, needs, published, failed, rejected] = await Promise.all([
      n(head()),
      n(head().in('status', ['ready', 'draft', 'failed'])),
      n(head().eq('status', 'published')),
      n(head().eq('status', 'failed')),
      n(head().eq('status', 'rejected')),
    ]);
    counts = { all, needs, published, failed, rejected };
  }

  const accounts = await listAccounts().catch(() => []);
  return NextResponse.json(
    {
      posts,
      hasMore,
      nextBefore: hasMore ? page[page.length - 1].created_at : null,
      counts,
      accounts: accounts.map((a) => ({ platform: a.platform, name: a.account_name })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Actions on one post:
 *   approve   queue publishing (captions/platforms edits applied first)
 *   save      keep caption/platform edits
 *   reject    take it out of the queue
 *   retry     re-queue publishing for a failed or partly published post; only the
 *             platforms that have not landed are attempted
 *   regenerate re-run the caption stage from the original capture: a fresh post
 *             is created and this one is rejected
 *   delete    remove the post row (media stays in the bucket for the archive)
 */
export async function POST(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { id, action, captions, platforms } = body as {
    id?: string;
    action?: 'approve' | 'reject' | 'save' | 'retry' | 'regenerate' | 'delete';
    captions?: Record<string, string>;
    platforms?: Platform[];
  };
  if (!id || !action) return NextResponse.json({ error: 'Send an id and an action' }, { status: 400 });

  const { data: post } = await db.from('content_posts').select('*').eq('id', id).single();
  if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });

  if (action === 'delete') {
    if (post.status === 'publishing') return NextResponse.json({ error: 'It is publishing right now' }, { status: 409 });
    const { error } = await db.from('content_posts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'deleted' });
  }

  if (action === 'regenerate') {
    if (!post.ingest_id) return NextResponse.json({ error: 'No original capture to regenerate from' }, { status: 409 });
    await db.from('content_posts').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    await db.from('content_ingest').update({ status: 'queued', error: null }).eq('id', post.ingest_id);
    await queueJob({ kind: 'caption', ingestId: post.ingest_id });
    return NextResponse.json({ ok: true, status: 'rejected', regenerating: true });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (captions) patch.captions = { ...post.captions, ...captions };
  if (platforms) patch.platforms = platforms;

  if (action === 'reject') {
    patch.status = 'rejected';
  } else if (action === 'approve') {
    if (post.status === 'published' || post.status === 'publishing') {
      return NextResponse.json({ error: `Already ${post.status}` }, { status: 409 });
    }
    patch.status = 'approved';
    patch.approved_at = new Date().toISOString();
  } else if (action === 'retry') {
    if (post.status !== 'failed' && post.status !== 'published') {
      return NextResponse.json({ error: `Nothing to retry on a ${post.status} post` }, { status: 409 });
    }
    const done = Object.keys((post.results ?? {}) as Record<string, unknown>).filter((k) => k !== 'drive');
    const wanted = ((platforms ?? post.platforms ?? []) as string[]).filter((p) => !done.includes(p));
    if (!wanted.length) return NextResponse.json({ error: 'Every selected platform already has this post' }, { status: 409 });
    patch.status = 'approved';
    patch.error = null;
    patch.approved_at = new Date().toISOString();
  }

  const { error } = await db.from('content_posts').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === 'approve' || action === 'retry') await queueJob({ kind: 'publish', postId: id });
  return NextResponse.json({ ok: true, status: patch.status ?? post.status });
}
