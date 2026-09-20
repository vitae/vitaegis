import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueJob } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'content';
const MAX_BYTES = 40 * 1024 * 1024;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov',
  'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
};

const kindFor = (mime: string) =>
  mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'voice' : 'photo';

/**
 * The iPhone Shortcut posts here. Accepts multipart (file + note) or JSON ({ note }).
 * Auth is a shared secret header, since anything inside a Shortcut is readable by
 * whoever holds the phone and must never be a Supabase key.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_INGEST_SECRET;
  if (!secret) return NextResponse.json({ error: 'Ingest is not configured' }, { status: 503 });
  if (req.headers.get('x-ingest-key') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  let note = '';
  let storagePath: string | null = null;
  let kind = 'text';

  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      note = String(form.get('note') ?? '');
      const file = form.get('file');
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: 'File is too large' }, { status: 413 });
        }
        const mime = file.type || 'application/octet-stream';
        kind = kindFor(mime);
        storagePath = `captured/${Date.now()}-${crypto.randomUUID()}.${EXT[mime] ?? 'bin'}`;
        const { error } = await db.storage
          .from(BUCKET)
          .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: mime, upsert: false });
        if (error) throw new Error(error.message);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      note = String(body.note ?? '');
    }
  } catch (err) {
    console.error('content ingest failed:', err);
    return NextResponse.json({ error: 'Could not read the upload' }, { status: 400 });
  }

  if (!note.trim() && !storagePath) {
    return NextResponse.json({ error: 'Send a file, a note, or both' }, { status: 400 });
  }

  const { data, error } = await db
    .from('content_ingest')
    .insert({ kind, storage_path: storagePath, note: note.trim(), status: 'queued' })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  await queueJob({ kind: 'caption', ingestId: data.id });
  return NextResponse.json({ ok: true, id: data.id, kind });
}
