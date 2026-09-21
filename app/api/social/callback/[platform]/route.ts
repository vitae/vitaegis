import { NextRequest, NextResponse } from 'next/server';
import { saveAccount, type Platform } from '@/lib/social/tokens';

export const dynamic = 'force-dynamic';

const META_VERSION = process.env.META_API_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${META_VERSION}`;

async function form(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(body),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

const expiry = (seconds?: number) => (seconds ? Math.floor(Date.now() / 1000) + seconds : null);

export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const { searchParams } = req.nextUrl;
  const origin = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const back = `${origin}/admin/content`;

  if (searchParams.get('error')) return NextResponse.redirect(`${back}?social=denied`);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // The state cookie is what stops a third party from completing this flow for us.
  const expected = req.cookies.get('social_state')?.value;
  if (!expected || searchParams.get('state') !== expected) {
    return NextResponse.redirect(`${back}?social=state-mismatch`);
  }

  const redirectUri = `${origin}/api/social/callback/${platform}`;

  try {
    if (platform === 'youtube') {
      const t = await form('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      const me = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${t.access_token}` },
        cache: 'no-store',
      }).then((r) => r.json()).catch(() => ({}));
      const channel = me?.items?.[0];
      await saveAccount({
        platform: 'youtube',
        account_id: channel?.id ?? null,
        account_name: channel?.snippet?.title ?? null,
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        expires_at: expiry(t.expires_in),
      });
    } else if (platform === 'tiktok') {
      const t = await form('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      await saveAccount({
        platform: 'tiktok',
        account_id: t.open_id ?? null,
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        expires_at: expiry(t.expires_in),
        scope: t.scope,
      });
    } else if (platform === 'twitter') {
      const verifier = req.cookies.get('social_verifier')?.value;
      if (!verifier) return NextResponse.redirect(`${back}?social=verifier-missing`);
      const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
      const t = await form(
        'https://api.x.com/2/oauth2/token',
        { code, grant_type: 'authorization_code', redirect_uri: redirectUri, code_verifier: verifier },
        { Authorization: `Basic ${basic}` },
      );
      const me = await fetch('https://api.x.com/2/users/me', {
        headers: { Authorization: `Bearer ${t.access_token}` },
        cache: 'no-store',
      }).then((r) => r.json()).catch(() => ({}));
      await saveAccount({
        platform: 'twitter',
        account_id: me?.data?.id ?? null,
        account_name: me?.data?.username ?? null,
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        expires_at: expiry(t.expires_in),
        scope: t.scope,
      });
    } else if (platform === 'facebook' || platform === 'instagram') {
      // Short-lived user token, then a long-lived one, then the Page token, which is
      // what actually publishes and which does not expire.
      const short = await fetch(
        `${GRAPH}/oauth/access_token?${new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: redirectUri,
          code,
        })}`,
        { cache: 'no-store' },
      ).then((r) => r.json());
      if (short.error) throw new Error(JSON.stringify(short.error).slice(0, 300));

      const long = await fetch(
        `${GRAPH}/oauth/access_token?${new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          fb_exchange_token: short.access_token,
        })}`,
        { cache: 'no-store' },
      ).then((r) => r.json());

      const pages = await fetch(
        `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${long.access_token}`,
        { cache: 'no-store' },
      ).then((r) => r.json());
      // Pick the Page deliberately. Taking pages.data[0] silently connected whichever
      // Page Meta happened to list first, which is rarely the one you want.
      interface MetaPage {
        id: string;
        name?: string;
        access_token: string;
        instagram_business_account?: { id: string; username?: string };
      }
      const all: MetaPage[] = pages?.data ?? [];
      if (!all.length) throw new Error('No Facebook Page on this account');
      const wantId = process.env.META_PAGE_ID;
      const wantName = process.env.META_PAGE_NAME || 'vitaegis';
      const page =
        (wantId && all.find((x) => x.id === wantId)) ||
        all.find((x) => (x.name ?? '').toLowerCase().includes(wantName.toLowerCase())) ||
        all[0];

      await saveAccount({
        platform: 'facebook',
        account_id: page.id,
        account_name: page.name,
        access_token: page.access_token,
        expires_at: null,
        // Keep the full list so a mis-pick is visible and fixable without reconnecting blind.
        meta: { chosen: page.name, available: all.map((x) => ({ id: x.id, name: x.name })) },
      });
      if (page.instagram_business_account?.id) {
        await saveAccount({
          platform: 'instagram',
          account_id: page.instagram_business_account.id,
          account_name: page.instagram_business_account.username ?? null,
          access_token: page.access_token,
          expires_at: null,
          meta: { page_id: page.id },
        });
      }
    } else {
      return NextResponse.json({ error: `Unknown platform "${platform}"` }, { status: 400 });
    }
  } catch (err) {
    console.error(`social connect ${platform} failed:`, err);
    return NextResponse.redirect(`${back}?social=error`);
  }

  const res = NextResponse.redirect(`${back}?social=connected&platform=${platform as Platform}`);
  res.cookies.delete('social_state');
  res.cookies.delete('social_verifier');
  return res;
}
