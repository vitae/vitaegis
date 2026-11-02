import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { adminAuthed } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** RUN / STOP for the Rust bot: writes kalshirust_config.desired_state, which the host's supervisor polls every 10 s. */
export async function POST(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const action = body?.action;
  if (action !== 'run' && action !== 'stop') {
    return NextResponse.json({ error: 'action must be run or stop' }, { status: 400 });
  }

  const desiredState = action === 'run' ? 'running' : 'stopped';
  const commandAt = new Date().toISOString();
  const { error } = await db
    .from('kalshirust_config')
    .upsert(
      { id: 1, desired_state: desiredState, command_at: commandAt, updated_at: commandAt },
      { onConflict: 'id' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ desiredState, commandAt });
}
