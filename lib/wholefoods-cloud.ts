/* ═══════════════════════════════════════════════════════════════════════════════
   Whole Foods run · Supabase sync (browser)
   The whole list lives in one wf_lists row per user. The browser reads and writes it
   with the anon key as the signed-in user; RLS keeps rows private. Realtime pushes
   the other device's changes here. Null client = not configured, stay local-only.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel, Session, SupabaseClient } from '@supabase/supabase-js';
import { loadState, type ListState } from './wholefoods';

let client: SupabaseClient | null | undefined;

export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}

export const syncConfigured = () => supabaseBrowser() !== null;

export async function currentSession(): Promise<Session | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const sb = supabaseBrowser();
  if (!sb) return () => undefined;
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Google sign-in, back to this page. */
export async function signInWithGoogle(): Promise<string | null> {
  const sb = supabaseBrowser();
  if (!sb) return 'Sync is not configured';
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  return error?.message ?? null;
}

export async function signOut(): Promise<void> {
  await supabaseBrowser()?.auth.signOut();
}

/** The cloud copy, or null when the user has none yet. */
export async function loadCloud(userId: string): Promise<ListState | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb
    .from('wf_lists')
    .select('state, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const state = loadState(JSON.stringify(data.state));
  return { ...state, updatedAt: state.updatedAt ?? (data.updated_at as string) };
}

export async function saveCloud(userId: string, state: ListState): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const { error } = await sb
    .from('wf_lists')
    .upsert(
      { user_id: userId, state, updated_at: state.updatedAt ?? new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(error.message);
}

/** Calls back with the new state whenever this user's row changes on the server. */
export function subscribeCloud(userId: string, cb: (state: ListState) => void): () => void {
  const sb = supabaseBrowser();
  if (!sb) return () => undefined;
  const channel: RealtimeChannel = sb
    .channel(`wf_lists:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wf_lists', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as { state?: unknown; updated_at?: string } | undefined;
        if (!row?.state) return;
        const state = loadState(JSON.stringify(row.state));
        cb({ ...state, updatedAt: state.updatedAt ?? row.updated_at });
      },
    )
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
