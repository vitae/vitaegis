import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Serves a post's media from vitaegis.com itself.
 *
 * TikTok's PULL_FROM_URL only accepts a domain verified in your TikTok app, and
 * Instagram requires a plain public URL it can cURL, so a Supabase signed URL will
 * not do. The token is the post id plus the ingest secret, so the media is only
 * reachable by something that already holds the secret.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const secret = process.env.CONTENT_MEDIA_SECRET || process.env.CONTENT_INGEST_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if (req.nextUrl.searchParams.get('t') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { data: post } = await db
    .from('content_posts')
    .select('media_path, media_paths, media_kind')
    .eq('id', id)
    .single();
  // A slide deck has several files; ?i= picks one, defaulting to the first.
  const paths: string[] = post?.media_paths?.length ? post.media_paths : post?.media_path ? [post.media_path] : [];
  const index = Number(req.nextUrl.searchParams.get('i') ?? 0);
  const path = paths[Number.isFinite(index) && index >= 0 ? index : 0];
  if (!path) return NextResponse.json({ error: 'No media' }, { status: 404 });

  const { data, error } = await db.storage.from('content').download(path);
  if (error || !data) return NextResponse.json({ error: 'Could not read media' }, { status: 404 });

  const bytes = Buffer.from(await data.arrayBuffer());
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': data.type || (post?.media_kind === 'video' ? 'video/mp4' : 'image/png'),
      'Content-Length': String(bytes.length),
      'Cache-Control': 'no-store',
    },
  });
}
