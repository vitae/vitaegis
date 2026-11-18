import { NextRequest, NextResponse } from 'next/server';
import { cronAuthed } from '@/lib/admin-auth';
import { runDueJobs } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Advances the pipeline. Driven by the Vercel cron entry in vercel.json, which sends
 * the CRON_SECRET as a bearer token. Safe to hit manually with the same header.
 */
async function handle(req: NextRequest) {
  if (!cronAuthed(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const ran = await runDueJobs(3);
    return NextResponse.json({ ok: true, ran });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('content worker failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
