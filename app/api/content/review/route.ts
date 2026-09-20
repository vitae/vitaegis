import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueJob, signedUrl } from '@/lib/pipeline';
import { listAccounts, type Platform } from '@/lib/social';

export const dynamic = 'force-dynamic';

const ADMIN = () => process.env.CONTENT_ADMIN_KEY;

function authed(req: NextRequest) {
  const key = ADMIN();
  if (!key) return false;
  return req.headers.get('x-admin-key') === key || req.nextUrl.searchParams.get('key') === key;
}

/** Pending and recent posts for the review screen. */
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { data } = await db.from('content_posts').select('*').order('created_at', { ascending: false }).limit(50);
  const posts = await Promise.all(
    (data ?? []).map(async (p) => ({
      ...p,
      // Signed URLs expire; hand the screen fresh ones each load, one per slide.
      media_urls: await Promise.all(
        ((p.media_paths?.length ? p.media_paths : p.media_path ? [p.media_path] : []) as string[]).map((path) =>
          signedUrl(path).catch(() => null),
        ),
      ).then((urls) => urls.filter(Boolean)),
    })),
  );
  const accounts = await listAccounts().catch(() => []);
  return NextResponse.json(
    { posts, accounts: accounts.map((a) => ({ platform: a.platform, name: a.account_name })) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Approve (queues publishing), reject, or edit captions and platforms before approving. */
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { id, action, captions, platforms } = body as {
    id?: string;
    action?: 'approve' | 'reject' | 'save';
    captions?: Record<string, string>;
    platforms?: Platform[];
  };
  if (!id || !action) return NextResponse.json({ error: 'Send an id and an action' }, { status: 400 });

  const { data: post } = await db.from('content_posts').select('*').eq('id', id).single();
  if (!post) return NextResponse.json({ error: 'No such post' }, { status: 404 });

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
  }

  const { error } = await db.from('content_posts').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === 'approve') await queueJob({ kind: 'publish', postId: id });
  return NextResponse.json({ ok: true, status: patch.status ?? post.status });
}
