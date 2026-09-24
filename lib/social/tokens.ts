// Per-platform OAuth credentials: stored in social_accounts, refreshed on demand.
import { supabaseAdmin } from '../supabase';

export type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'twitter';
export const PLATFORMS: Platform[] = ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter'];

export interface Account {
  platform: Platform;
  account_id: string | null;
  account_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
  meta: Record<string, unknown>;
}

function db() {
  const client = supabaseAdmin();
  if (!client) throw new Error('Supabase is not configured');
  return client;
}

export async function saveAccount(
  a: Partial<Account> & { platform: Platform; access_token: string },
) {
  const { error } = await db()
    .from('social_accounts')
    .upsert({ ...a, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function listAccounts(): Promise<Account[]> {
  const { data } = await db().from('social_accounts').select('*');
  return (data ?? []) as Account[];
}

async function raw(platform: Platform): Promise<Account | null> {
  const { data } = await db().from('social_accounts').select('*').eq('platform', platform).single();
  return (data as Account) ?? null;
}

const expiringSoon = (a: Account) =>
  a.expires_at !== null && a.expires_at - 300 <= Math.floor(Date.now() / 1000);

async function form(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {},
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(body),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`Token refresh failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

/** Refresh in place and return a usable access token. */
export async function accessToken(platform: Platform): Promise<Account> {
  const account = await raw(platform);
  if (!account) throw new Error(`${platform} is not connected`);
  if (!expiringSoon(account)) return account;

  if (!account.refresh_token) {
    throw new Error(`${platform} token expired and there is no refresh token; reconnect it`);
  }

  let next: { access_token: string; refresh_token?: string; expires_in?: number };
  if (platform === 'youtube') {
    next = await form('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    });
  } else if (platform === 'tiktok') {
    next = await form('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    });
  } else if (platform === 'twitter') {
    const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString(
      'base64',
    );
    next = await form(
      'https://api.x.com/2/oauth2/token',
      { refresh_token: account.refresh_token, grant_type: 'refresh_token' },
      { Authorization: `Basic ${basic}` },
    );
  } else {
    // Meta Page tokens derived from a long-lived user token do not expire.
    return account;
  }

  const updated: Account = {
    ...account,
    access_token: next.access_token,
    refresh_token: next.refresh_token ?? account.refresh_token,
    expires_at: next.expires_in ? Math.floor(Date.now() / 1000) + next.expires_in : null,
  };
  await saveAccount(updated);
  return updated;
}
