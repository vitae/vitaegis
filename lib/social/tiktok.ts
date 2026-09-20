// TikTok direct post via the Content Posting API.
// Docs: developers.tiktok.com/doc/content-posting-api-reference-direct-post
// PULL_FROM_URL requires the media host to be a domain verified in your TikTok app,
// so serve the media from vitaegis.com rather than a Supabase signed URL.
import { accessToken } from './tokens';
import type { PostResult } from './types';

const API = 'https://open.tiktokapis.com/v2';

async function call(path: string, token: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json?.error?.code && json.error.code !== 'ok')) {
    throw new Error(`TikTok ${path} failed: ${res.status} ${JSON.stringify(json?.error ?? json).slice(0, 400)}`);
  }
  return json;
}

export async function postToTikTok(
  caption: string,
  mediaUrl: string,
  kind: string,
  aiGenerated = true,
): Promise<PostResult> {
  if (kind !== 'video' || !mediaUrl) throw new Error('TikTok needs a video');
  const account = await accessToken('tiktok');

  const init = await call('/post/publish/video/init/', account.access_token, {
    post_info: {
      title: caption.slice(0, 2200),
      privacy_level: process.env.TIKTOK_PRIVACY || 'SELF_ONLY',
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      // Labels the post as AI-generated, which TikTok requires for synthetic media.
      is_aigc: aiGenerated,
    },
    source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
  });

  const publishId = init?.data?.publish_id;
  if (!publishId) throw new Error('TikTok returned no publish_id');

  // TikTok pulls and processes asynchronously; surface a terminal failure rather than
  // reporting success for a post that never appeared.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await call('/post/publish/status/fetch/', account.access_token, { publish_id: publishId });
    const s = status?.data?.status;
    if (s === 'PUBLISH_COMPLETE') {
      return { platform: 'tiktok', id: publishId, raw: status };
    }
    if (s === 'FAILED') {
      throw new Error(`TikTok publish failed: ${JSON.stringify(status?.data ?? {}).slice(0, 300)}`);
    }
  }
  // Still processing: the post is in flight, so record it rather than retrying and double-posting.
  return { platform: 'tiktok', id: publishId, raw: { status: 'PROCESSING', publish_id: publishId } };
}
