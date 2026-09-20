// Native publishing. Each network is called directly, so the content, the timing and
// the credentials all stay here rather than behind a third-party relay.
import { postToFacebook, postToInstagram } from './meta';
import { postToYouTube } from './youtube';
import { postToTikTok } from './tiktok';
import { postToX } from './x';
import { listAccounts, PLATFORMS, type Platform } from './tokens';
import type { PostResult } from './types';

export { PLATFORMS, listAccounts, type Platform };
export type { PostResult };

const DISCLOSURE = 'Made with AI.';

export interface PublishInput {
  captions: Partial<Record<Platform | 'default', string>>;
  mediaUrl?: string;
  mediaKind?: string;
  platforms: Platform[];
  aiDisclosure?: boolean;
  /** Platforms already posted to on an earlier attempt; skipped so a retry cannot double-post. */
  alreadyDone?: string[];
}

export interface PublishOutcome {
  results: Record<string, PostResult>;
  failures: Record<string, string>;
}

/** Which platforms can accept this post at all. */
export function eligible(platforms: Platform[], mediaKind: string | undefined) {
  const isVideo = mediaKind === 'video';
  return platforms.filter((p) => {
    if (p === 'youtube' || p === 'tiktok') return isVideo;  // both are video-only here
    if (p === 'instagram') return Boolean(mediaKind && mediaKind !== 'none');  // IG always needs media
    return true;
  });
}

export async function publish(input: PublishInput): Promise<PublishOutcome> {
  const disclose = (p: Platform) => {
    const base = (input.captions[p] ?? input.captions.default ?? '').trim();
    if (!input.aiDisclosure || !base || base.includes(DISCLOSURE)) return base;
    return `${base}\n\n${DISCLOSURE}`;
  };

  const results: Record<string, PostResult> = {};
  const failures: Record<string, string> = {};
  const targets = eligible(input.platforms, input.mediaKind).filter(
    (p) => !(input.alreadyDone ?? []).includes(p),
  );

  // Sequential on purpose: one network failing must not abort the others, and the
  // per-platform result is recorded as each one lands.
  for (const platform of targets) {
    try {
      const caption = disclose(platform);
      const url = input.mediaUrl;
      const kind = input.mediaKind;
      const ai = input.aiDisclosure ?? true;

      if (platform === 'facebook') results[platform] = await postToFacebook(caption, url, kind);
      else if (platform === 'instagram') results[platform] = await postToInstagram(caption, url!, kind!);
      else if (platform === 'youtube') results[platform] = await postToYouTube(caption, url!, kind!);
      else if (platform === 'tiktok') results[platform] = await postToTikTok(caption, url!, kind!, ai);
      else if (platform === 'twitter') results[platform] = await postToX(caption, url, kind, ai);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures[platform] = message;
      console.error(`publish to ${platform} failed:`, message);
    }
  }
  return { results, failures };
}
