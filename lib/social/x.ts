// X (Twitter) posting on API v2.
// Docs: docs.x.com/x-api/posts/creation-of-a-post
// Posting requires a paid API tier. Media goes up through the chunked upload
// endpoints first, then the returned id is attached to the post.
import { accessToken } from './tokens';
import type { PostResult } from './types';

const API = 'https://api.x.com/2';
const CHUNK = 4 * 1024 * 1024;

async function uploadMedia(token: string, bytes: Buffer, mimeType: string, category: string) {
  const init = await fetch(`${API}/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: 'INIT',
      total_bytes: bytes.length,
      media_type: mimeType,
      media_category: category,
    }),
    cache: 'no-store',
  });
  const initJson = await init.json().catch(() => ({}));
  if (!init.ok) throw new Error(`X media INIT failed: ${init.status} ${JSON.stringify(initJson).slice(0, 300)}`);
  const mediaId = initJson?.data?.id ?? initJson?.media_id_string ?? initJson?.id;
  if (!mediaId) throw new Error('X media upload returned no id');

  for (let i = 0, seg = 0; i < bytes.length; i += CHUNK, seg++) {
    const form = new FormData();
    form.set('command', 'APPEND');
    form.set('media_id', String(mediaId));
    form.set('segment_index', String(seg));
    form.set('media', new Blob([new Uint8Array(bytes.subarray(i, i + CHUNK))]));
    const res = await fetch(`${API}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`X media APPEND ${seg} failed: ${res.status}`);
  }

  const fin = await fetch(`${API}/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'FINALIZE', media_id: String(mediaId) }),
    cache: 'no-store',
  });
  const finJson = await fin.json().catch(() => ({}));
  if (!fin.ok) throw new Error(`X media FINALIZE failed: ${fin.status} ${JSON.stringify(finJson).slice(0, 300)}`);

  // Video needs transcoding before it can be attached.
  let state = finJson?.data?.processing_info?.state ?? finJson?.processing_info?.state;
  for (let i = 0; state && state !== 'succeeded' && i < 20; i++) {
    if (state === 'failed') throw new Error('X media processing failed');
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(`${API}/media/upload?command=STATUS&media_id=${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const stJson = await st.json().catch(() => ({}));
    state = stJson?.data?.processing_info?.state ?? stJson?.processing_info?.state ?? 'succeeded';
  }
  return String(mediaId);
}

export async function postToX(
  caption: string,
  mediaUrl?: string,
  kind?: string,
  aiGenerated = true,
): Promise<PostResult> {
  const account = await accessToken('twitter');
  const body: Record<string, unknown> = { text: caption.slice(0, 280), made_with_ai: aiGenerated };

  if (mediaUrl) {
    const media = await fetch(mediaUrl, { cache: 'no-store' });
    if (!media.ok) throw new Error(`Could not fetch media for X: ${media.status}`);
    const bytes = Buffer.from(await media.arrayBuffer());
    const isVideo = kind === 'video';
    const mediaId = await uploadMedia(
      account.access_token,
      bytes,
      isVideo ? 'video/mp4' : media.headers.get('content-type') || 'image/png',
      isVideo ? 'tweet_video' : 'tweet_image',
    );
    body.media = { media_ids: [mediaId] };
  }

  const res = await fetch(`${API}/tweets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X post failed: ${res.status} ${JSON.stringify(json).slice(0, 400)}`);

  const id = json?.data?.id;
  return { platform: 'twitter', id, url: id ? `https://x.com/i/web/status/${id}` : undefined, raw: json };
}
