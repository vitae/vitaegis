import { NextRequest, NextResponse } from 'next/server';
import { autopilotConfig, planNext } from '@/lib/autopilot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Plans the next autopilot Short. Driven hourly by the Vercel cron in vercel.json with
 * the CRON_SECRET bearer token; the worker cron does the rendering and publishing.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const result = await planNext();
    const { enabled, perDay, platforms } = autopilotConfig();
    return NextResponse.json({ ok: true, enabled, perDay, platforms, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('autopilot failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
