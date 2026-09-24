import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { researchAuthed } from '@/lib/research-auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 50 * 1024 * 1024; // Gemini's PDF ceiling

/**
 * Books are bigger than a Vercel request body allows, so the browser uploads straight to
 * the private 'content' bucket with a one-shot signed URL and then registers the path.
 */
export async function POST(req: NextRequest) {
  if (!researchAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const { name, size, type } = (await req.json().catch(() => ({}))) as {
    name?: string;
    size?: number;
    type?: string;
  };
  if (!name || !size)
    return NextResponse.json({ error: 'Send the file name and size' }, { status: 400 });
  if (size > MAX_BYTES)
    return NextResponse.json({ error: 'PDFs are capped at 50 MB' }, { status: 413 });
  if (type && type !== 'application/pdf')
    return NextResponse.json({ error: 'Only PDFs are accepted here' }, { status: 415 });

  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
  const path = `research/${Date.now()}-${crypto.randomUUID()}-${safe}`;
  const { data, error } = await db.storage.from('content').createSignedUploadUrl(path);
  if (error || !data)
    return NextResponse.json({ error: error?.message ?? 'Could not sign upload' }, { status: 500 });

  return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
}
