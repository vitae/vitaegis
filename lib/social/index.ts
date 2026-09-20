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
  mediaUrls?: string[];
  mediaKind?: string;
  platforms: Platform[];
  aiDisclosure?: boolean;
  /** Platforms already posted to on an earlier attempt; skipped so a retry cannot double-post. */
  alreadyDone?: string[];
}

export interface PublishOutcome {
  results: Record<string, PostResult>;
  failures: Record<string, string>;
  /** Selected but not attempted: no account connected, or the media is the wrong kind. */
  skipped: string[];
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

  // Only publish where an account is actually connected, so running with two networks
  // set up is a normal state rather than three guaranteed failures.
  const connected = new Set((await listAccounts()).map((a) => a.platform));
  const wanted = input.platforms.filter((p) => !(input.alreadyDone ?? []).includes(p));
  const targets = eligible(wanted, input.mediaKind).filter((p) => connected.has(p));
  const skipped = wanted.filter((p) => !targets.includes(p));

  // Sequential on purpose: one network failing must not abort the others, and the
  // per-platform result is recorded as each one lands.
  for (const platform of targets) {
    try {
      const caption = disclose(platform);
      const urls = input.mediaUrls ?? [];
      const kind = input.mediaKind;
      const ai = input.aiDisclosure ?? true;

      // Instagram takes the whole deck as a carousel and X takes up to four stills;
      // the rest take the first file.
      if (platform === 'facebook') results[platform] = await postToFacebook(caption, urls[0], kind);
      else if (platform === 'instagram') results[platform] = await postToInstagram(caption, urls, kind!);
      else if (platform === 'youtube') results[platform] = await postToYouTube(caption, urls[0], kind!);
      else if (platform === 'tiktok') results[platform] = await postToTikTok(caption, urls[0], kind!, ai);
      else if (platform === 'twitter') results[platform] = await postToX(caption, urls, kind, ai);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures[platform] = message;
      console.error(`publish to ${platform} failed:`, message);
    }
  }
  return { results, failures, skipped };
}
