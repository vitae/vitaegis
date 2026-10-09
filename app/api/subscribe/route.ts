import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/vitae/tools';

export const dynamic = 'force-dynamic';

const SOURCES = new Set(['home', 'vitae']);

/** POST { email, source? } → { ok: true }. Duplicates are fine. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; source?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: 'That does not look like an email address.' },
      { status: 400 },
    );
  }
  const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'home';
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Subscriptions are not open yet' }, { status: 503 });
  }
  const { error } = await admin
    .from('subscribers')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) {
    console.error('[subscribe] failed', error.message);
    return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
