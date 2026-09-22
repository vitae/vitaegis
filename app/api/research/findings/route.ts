import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { researchAuthed } from '@/lib/research-auth';

export const dynamic = 'force-dynamic';

/** Quotes and findings, filterable by ?topic= and ?source=, with the source they came from. */
export async function GET(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const topic = req.nextUrl.searchParams.get('topic');
  const source = req.nextUrl.searchParams.get('source');
  let q = db
    .from('research_findings')
    .select('id, kind, text, evidence, location, topic, strength, created_at, source:research_sources(id, title, author, kind, url)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (topic) q = q.eq('topic', topic);
  if (source) q = q.eq('source_id', source);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ findings: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
