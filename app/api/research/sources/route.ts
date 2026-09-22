import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueJob } from '@/lib/pipeline';
import { researchAuthed } from '@/lib/research-auth';
import { TOPICS, isYouTube, type SourceKind } from '@/lib/research';

export const dynamic = 'force-dynamic';

/** Every source with its extraction state, newest first. */
export async function GET(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { data, error } = await db
    .from('research_sources')
    .select('id, kind, title, author, url, storage_path, note, topics, status, summary, error, findings_count, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [], topics: TOPICS }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Add a source and queue its extraction. Send { url } for YouTube, articles and paper
 * links; { storage_path, mime_type } after uploading a PDF through /api/research/upload;
 * or { text } to paste something in. action: 'retry' re-queues one; 'delete' removes one.
 */
export async function POST(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'retry' | 'delete';
    id?: string;
    url?: string;
    storage_path?: string;
    mime_type?: string;
    text?: string;
    title?: string;
    author?: string;
    note?: string;
    topics?: string[];
  };

  if (body.action === 'delete' && body.id) {
    const { data: row } = await db.from('research_sources').select('storage_path').eq('id', body.id).single();
    if (row?.storage_path) await db.storage.from('content').remove([row.storage_path]);
    const { error } = await db.from('research_sources').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'retry' && body.id) {
    await db.from('research_sources').update({ status: 'queued', error: null }).eq('id', body.id);
    await queueJob({ kind: 'research_extract', payload: { sourceId: body.id } });
    return NextResponse.json({ ok: true });
  }

  const url = body.url?.trim();
  const text = body.text?.trim();
  let kind: SourceKind;
  if (body.storage_path) kind = 'pdf';
  else if (url && isYouTube(url)) kind = 'youtube';
  else if (url) kind = 'url';
  else if (text) kind = 'text';
  else return NextResponse.json({ error: 'Send a url, an uploaded storage_path, or text' }, { status: 400 });

  if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'URLs must start with http(s)://' }, { status: 400 });

  const topics = (body.topics ?? []).filter((t): t is (typeof TOPICS)[number] => (TOPICS as readonly string[]).includes(t));
  const { data, error } = await db
    .from('research_sources')
    .insert({
      kind,
      title: body.title?.trim() || null,
      author: body.author?.trim() || null,
      url: url || null,
      storage_path: body.storage_path ?? null,
      mime_type: body.mime_type ?? (kind === 'pdf' ? 'application/pdf' : null),
      // For pasted text the note *is* the source; otherwise it is guidance for the reader.
      note: kind === 'text' ? text : body.note?.trim() ?? '',
      topics,
      status: 'queued',
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await queueJob({ kind: 'research_extract', payload: { sourceId: data.id } });
  return NextResponse.json({ ok: true, id: data.id, kind });
}
