import { supabaseAdmin } from '../../lib/supabase';

/** Service-role Supabase client, or a clear error naming the variables that are missing. */
export function db() {
  const client = supabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return client;
}

/** Clip a string for tool output so a caption never floods the model. */
export const clip = (s: unknown, n = 280) => {
  const text = typeof s === 'string' ? s : s == null ? '' : String(s);
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
};
