// Facebook Pages and Instagram publishing on the Meta Graph API.
// Docs: developers.facebook.com/docs/pages-api/posts
//       developers.facebook.com/docs/instagram-platform/content-publishing
import { accessToken } from './tokens';
import type { PostResult } from './types';

const VERSION = process.env.META_API_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${VERSION}`;

async function graph(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'POST') {
  const url = new URL(`${GRAPH}${path}`);
  const init: RequestInit = { method, cache: 'no-store' };
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  } else {
    init.body = new URLSearchParams(params);
    init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`Graph ${path} failed: ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 400)}`);
  }
  return json;
}

// ── Facebook Page ───────────────────────────────────────────────────────────

export async function postToFacebook(caption: string, mediaUrl?: string, kind?: string): Promise<PostResult> {
  const account = await accessToken('facebook');
  const pageId = account.account_id;
  if (!pageId) throw new Error('No Facebook Page id stored');

  let json;
  if (mediaUrl && kind === 'video') {
    json = await graph(`/${pageId}/videos`, { file_url: mediaUrl, description: caption, access_token: account.access_token });
  } else if (mediaUrl) {
    json = await graph(`/${pageId}/photos`, { url: mediaUrl, caption, access_token: account.access_token });
  } else {
    json = await graph(`/${pageId}/feed`, { message: caption, access_token: account.access_token });
  }
  const id = json.post_id ?? json.id;
  return { platform: 'facebook', id, url: id ? `https://www.facebook.com/${id}` : undefined, raw: json };
}

// ── Instagram ───────────────────────────────────────────────────────────────

/** Video and carousel containers are processed asynchronously; publishing before FINISHED fails. */
async function waitForContainer(containerId: string, token: string, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const json = await graph(`/${containerId}`, { fields: 'status_code,status', access_token: token }, 'GET');
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR' || json.status_code === 'EXPIRED') {
      throw new Error(`Instagram container ${json.status_code}: ${json.status ?? ''}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Instagram container never finished processing');
}

export async function postToInstagram(caption: string, mediaUrls: string[], kind: string): Promise<PostResult> {
  const account = await accessToken('instagram');
  const igId = account.account_id;
  if (!igId) throw new Error('No Instagram user id stored');
  if (!mediaUrls.length) throw new Error('Instagram requires media');

  const token = account.access_token;
  const isVideo = kind === 'video';

  // More than one still is a carousel: a child container per slide, then a parent
  // that lists them. Instagram caps this at ten and crops all slides to the first.
  if (!isVideo && mediaUrls.length > 1) {
    const children: string[] = [];
    for (const url of mediaUrls.slice(0, 10)) {
      const child = await graph(`/${igId}/media`, {
        image_url: url,
        is_carousel_item: 'true',
        access_token: token,
      });
      children.push(child.id);
    }
    const parent = await graph(`/${igId}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
      access_token: token,
    });
    await waitForContainer(parent.id, token);
    const published = await graph(`/${igId}/media_publish`, { creation_id: parent.id, access_token: token });
    return {
      platform: 'instagram',
      id: published.id,
      url: published.id ? `https://www.instagram.com/p/${published.id}` : undefined,
      raw: { ...published, slides: children.length },
    };
  }

  const container = await graph(`/${igId}/media`, {
    ...(isVideo ? { video_url: mediaUrls[0], media_type: 'REELS' } : { image_url: mediaUrls[0] }),
    caption,
    access_token: token,
  });
  if (isVideo) await waitForContainer(container.id, token);

  const published = await graph(`/${igId}/media_publish`, { creation_id: container.id, access_token: token });
  return {
    platform: 'instagram',
    id: published.id,
    url: published.id ? `https://www.instagram.com/p/${published.id}` : undefined,
    raw: published,
  };
}
