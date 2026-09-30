import { NextRequest, NextResponse } from 'next/server';
import { paywallEnabled } from '@/lib/keycrate/access-server';

/**
 * Allowlist check after Google sign-in: the browser signs back out when `allowed` is false.
 * With the paywall on, anyone may sign in (that starts their free day); KEYCRATE_ALLOWED_EMAILS
 * then only decides who can stream Google Drive audio. Without the paywall the list still limits
 * who can sign in, and when it is unset anyone can.
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
  if (paywallEnabled()) return NextResponse.json({ ok: true, allowed: true });
  const allowed = (process.env.KEYCRATE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return NextResponse.json({ ok: true, allowed: allowed.length === 0 || allowed.includes(email) });
}
