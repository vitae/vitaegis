import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowlist check before the browser asks Supabase for a magic link. KEYCRATE_ALLOWED_EMAILS
 * (comma-separated) limits who can sign in; when it is unset anyone can. The response is the
 * same shape either way so addresses can't be probed.
 */
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Cloud sync is not configured' }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  }
  const allowed = (process.env.KEYCRATE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return NextResponse.json({ ok: true, allowed: allowed.length === 0 || allowed.includes(email) });
}
