import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const META_VERSION = process.env.META_API_VERSION || 'v21.0';

const base64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * One-time connect for each network. Open
 *   /api/social/connect/<platform>?key=<CONTENT_ADMIN_KEY>
 * and approve. Platforms: facebook, instagram (one Meta grant covers both),
 * youtube, tiktok, twitter.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const admin = process.env.CONTENT_ADMIN_KEY;
  if (!admin || req.nextUrl.searchParams.get('key') !== admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const origin = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const redirectUri = `${origin}/api/social/callback/${platform}`;
  const state = base64url(randomBytes(16));
  let url: string;
  let verifier: string | null = null;

  if (platform === 'youtube') {
    const q = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      // offline + consent is what actually yields a refresh token.
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    url = `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  } else if (platform === 'tiktok') {
    const q = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
      scope: 'video.publish,video.upload',
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    url = `https://www.tiktok.com/v2/auth/authorize/?${q}`;
  } else if (platform === 'twitter') {
    verifier = base64url(randomBytes(48));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.X_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read media.write offline.access',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    url = `https://x.com/i/oauth2/authorize?${q}`;
  } else if (platform === 'facebook' || platform === 'instagram') {
    const q = new URLSearchParams({
      client_id: process.env.META_APP_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management',
      state,
    });
    url = `https://www.facebook.com/${META_VERSION}/dialog/oauth?${q}`;
  } else {
    return NextResponse.json({ error: `Unknown platform "${platform}"` }, { status: 400 });
  }

  const res = NextResponse.redirect(url);
  const cookie = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 600 };
  res.cookies.set('social_state', state, cookie);
  if (verifier) res.cookies.set('social_verifier', verifier, cookie);
  return res;
}
