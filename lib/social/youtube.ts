// YouTube upload via the resumable protocol.
// Docs: developers.google.com/youtube/v3/docs/videos/insert
// Quota: a video insert costs 1600 units against the default 10,000/day, so about
// six uploads a day until you request more.
import { accessToken } from './tokens';
import type { PostResult } from './types';

const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';
const THUMBS = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set';

/** YouTube wants a title and a description; the caption carries both, split on the first blank line. */
export function splitCaption(caption: string) {
  const [first, ...rest] = caption.split(/\n\s*\n/);
  const title = (first ?? 'Vitaegis').trim().slice(0, 100);
  let description = rest.join('\n\n').trim() || title;
  // A vertical clip under three minutes is a Short either way; the tag helps it surface.
  if (!/#shorts\b/i.test(`${title} ${description}`)) description = `${description}\n\n#Shorts`;
  return { title, description: description.slice(0, 5000) };
}

export async function postToYouTube(
  caption: string,
  mediaUrl: string,
  kind: string,
  aiGenerated = true,
  thumbnail?: Buffer,
): Promise<PostResult> {
  if (kind !== 'video' || !mediaUrl) throw new Error('YouTube needs a video');
  const account = await accessToken('youtube');
  const { title, description } = splitCaption(caption);

  const media = await fetch(mediaUrl, { cache: 'no-store' });
  if (!media.ok) throw new Error(`Could not fetch media for YouTube: ${media.status}`);
  const bytes = Buffer.from(await media.arrayBuffer());

  // Step 1: open a resumable session and read the upload URL out of the Location header.
  const start = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(bytes.length),
    },
    body: JSON.stringify({
      snippet: { title, description, categoryId: process.env.YOUTUBE_CATEGORY_ID || '22' },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY || 'public',
        selfDeclaredMadeForKids: false,
        // YouTube's own altered-or-synthetic label; required for realistic AI footage.
        containsSyntheticMedia: aiGenerated,
      },
    }),
    cache: 'no-store',
  });
  if (!start.ok)
    throw new Error(
      `YouTube session failed: ${start.status} ${(await start.text()).slice(0, 300)}`,
    );
  const location = start.headers.get('location');
  if (!location) throw new Error('YouTube returned no resumable upload URL');

  // Step 2: send the bytes in one PUT. Veo clips are small enough not to need chunking.
  const put = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) },
    body: new Uint8Array(bytes),
    cache: 'no-store',
  });
  const json = await put.json().catch(() => ({}));
  if (!put.ok)
    throw new Error(`YouTube upload failed: ${put.status} ${JSON.stringify(json).slice(0, 300)}`);

  // Custom thumbnails need a verified channel, and Shorts often show a frame instead;
  // a refusal here is recorded, never a failed post.
  let thumb: string | undefined;
  if (thumbnail && json.id) {
    const t = await fetch(`${THUMBS}?videoId=${json.id}&uploadType=media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'image/png' },
      body: new Uint8Array(thumbnail),
      cache: 'no-store',
    }).catch((err: unknown) => ({ ok: false, status: 0, text: async () => String(err) }));
    thumb = t.ok ? 'set' : `not set: ${t.status} ${(await t.text()).slice(0, 200)}`;
  }

  return {
    platform: 'youtube',
    id: json.id,
    url: json.id ? `https://www.youtube.com/watch?v=${json.id}` : undefined,
    raw: thumb ? { ...json, thumbnail: thumb } : json,
  };
}
