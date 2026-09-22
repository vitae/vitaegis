import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueJob } from '@/lib/pipeline';
import { researchAuthed } from '@/lib/research-auth';
import { TOPICS } from '@/lib/research';

export const dynamic = 'force-dynamic';

/** Briefs, newest first. */
export async function GET(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { data, error } = await db.from('research_briefs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ briefs: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * action 'build': collate a topic (optionally limited to source_ids) into a new brief.
 * action 'post': hand a ready brief to the content pipeline; it shows up in /admin/content.
 * action 'rebuild' / 'delete': what they say.
 */
export async function POST(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'build' | 'post' | 'rebuild' | 'delete';
    id?: string;
    topic?: string;
    source_ids?: string[];
  };

  if (body.action === 'build') {
    const topic = body.topic;
    if (!topic || !(TOPICS as readonly string[]).includes(topic)) {
      return NextResponse.json({ error: `Pick a topic: ${TOPICS.join(', ')}` }, { status: 400 });
    }
    const { data, error } = await db
      .from('research_briefs')
      .insert({ topic, source_ids: body.source_ids ?? [], status: 'queued' })
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    await queueJob({ kind: 'research_brief', payload: { briefId: data.id } });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (!body.id) return NextResponse.json({ error: 'Send an id' }, { status: 400 });
  const { data: brief } = await db.from('research_briefs').select('id, status, ingest_id').eq('id', body.id).single();
  if (!brief) return NextResponse.json({ error: 'No such brief' }, { status: 404 });

  if (body.action === 'delete') {
    const { error } = await db.from('research_briefs').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'rebuild') {
    await db.from('research_briefs').update({ status: 'queued', error: null, ingest_id: null }).eq('id', body.id);
    await queueJob({ kind: 'research_brief', payload: { briefId: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'post') {
    if (brief.status !== 'ready') return NextResponse.json({ error: `Brief is ${brief.status}, not ready` }, { status: 409 });
    if (brief.ingest_id) return NextResponse.json({ error: 'Already sent to the post queue' }, { status: 409 });
    await queueJob({ kind: 'research_post', payload: { briefId: body.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
