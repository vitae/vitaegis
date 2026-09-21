import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { listAccounts } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * Setup check for the content pipeline. Reports which pieces are in place without
 * ever returning a secret: each variable is only ever reported as set or not set.
 */
export async function GET(req: NextRequest) {
  const admin = process.env.CONTENT_ADMIN_KEY;
  if (!admin || (req.headers.get('x-admin-key') !== admin && req.nextUrl.searchParams.get('key') !== admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const has = (name: string) => Boolean(process.env[name]);
  const env = {
    core: {
      NEXT_PUBLIC_BASE_URL: has('NEXT_PUBLIC_BASE_URL'),
      CONTENT_INGEST_SECRET: has('CONTENT_INGEST_SECRET'),
      CONTENT_ADMIN_KEY: has('CONTENT_ADMIN_KEY'),
      CRON_SECRET: has('CRON_SECRET'),
    },
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: has('NEXT_PUBLIC_SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
    },
    google: { GEMINI_API_KEY: has('GEMINI_API_KEY') },
    drive: {
      GOOGLE_SERVICE_ACCOUNT_JSON: has('GOOGLE_SERVICE_ACCOUNT_JSON'),
      GOOGLE_SERVICE_ACCOUNT_EMAIL: has('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      GOOGLE_SERVICE_ACCOUNT_KEY: has('GOOGLE_SERVICE_ACCOUNT_KEY'),
      GDRIVE_FOLDER_ID: has('GDRIVE_FOLDER_ID'),
    },
    facebook: { META_APP_ID: has('META_APP_ID'), META_APP_SECRET: has('META_APP_SECRET') },
    youtube: {
      GOOGLE_OAUTH_CLIENT_ID: has('GOOGLE_OAUTH_CLIENT_ID'),
      GOOGLE_OAUTH_CLIENT_SECRET: has('GOOGLE_OAUTH_CLIENT_SECRET'),
    },
    tiktok: { TIKTOK_CLIENT_KEY: has('TIKTOK_CLIENT_KEY'), TIKTOK_CLIENT_SECRET: has('TIKTOK_CLIENT_SECRET') },
    x: { X_CLIENT_ID: has('X_CLIENT_ID'), X_CLIENT_SECRET: has('X_CLIENT_SECRET') },
  };

  const db = supabaseAdmin();
  const tables: Record<string, string> = {};
  let bucket = 'unknown';
  if (db) {
    for (const t of ['content_ingest', 'content_posts', 'content_jobs', 'social_accounts']) {
      const { error } = await db.from(t).select('*', { head: true, count: 'exact' }).limit(1);
      tables[t] = error ? `missing (${error.message.slice(0, 60)})` : 'ok';
    }
    const { data: buckets } = await db.storage.listBuckets();
    bucket = buckets?.some((b) => b.name === 'content') ? 'ok' : 'missing';
  }

  const accounts = await listAccounts().catch(() => []);
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  return NextResponse.json(
    {
      baseUrl: base,
      // Paste these into each provider exactly as shown.
      callbacks: ['facebook', 'youtube', 'tiktok', 'twitter'].reduce(
        (acc, p) => ({ ...acc, [p]: `${base}/api/social/callback/${p}` }),
        {} as Record<string, string>,
      ),
      env,
      database: db ? { tables, bucket } : 'supabase not configured',
      connected: accounts.map((a) => ({ platform: a.platform, name: a.account_name, id: a.account_id })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
