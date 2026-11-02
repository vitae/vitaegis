import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { adminAuthed } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Flips the Rust bot between NORMAL and RISK; the bot reads kalshirust_config on each loop. */
export async function POST(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { mode?: unknown } | null;
  const mode = body?.mode;
  if (mode !== 'NORMAL' && mode !== 'RISK') {
    return NextResponse.json({ error: 'mode must be NORMAL or RISK' }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await db
    .from('kalshirust_config')
    .upsert({ id: 1, mode, updated_at: updatedAt }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mode, updatedAt });
}
