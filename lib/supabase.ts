import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Server-only Supabase client using the service role key. Returns null when env is not configured. */
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
