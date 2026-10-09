---
description: Use before planning or queueing posts, to respect what each network allows, charges, or refuses.
---

# Platform rules that actually bite

These come from running the pipeline, not from docs. Plan around them.

| Network   | Takes                         | Limits and gotchas                                                                                                     |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Instagram | image, carousel (≤10), Reel   | Needs a Business/Creator account on a Page and app review for publishing. Carousel crops every slide to the first one. |
| Facebook  | image, video, text            | Same Meta app as Instagram; one connect covers both.                                                                   |
| YouTube   | video only (Shorts)           | 1,600 quota units per upload against 10,000/day: about six uploads a day. Thumbnails via API are fine.                 |
| TikTok    | video only                    | Pulls media only from the verified domain, so media is served from vitaegis.com. Posts are SELF_ONLY until app audit.  |
| X         | text, up to 4 images, video   | Posting needs a paid API tier. Cheapest to produce, smallest reach.                                                    |

## Media kinds and cost

- **cards**: branded concept cards drawn on the server from text you supply (title, points,
  dossier code). Free, instant, exact wording, no AI label. Feed carousel: Instagram, Facebook, X.
- **reel**: the same cards cut into a vertical video. Free, instant. Goes everywhere: Instagram
  Reels, Facebook, YouTube Shorts, TikTok. The default for YouTube when Veo is unavailable.

- **original**: the operator's own captured photo or clip. Free, no AI label, best content. Only
  available when a capture came in from the Shortcut; the agent cannot create one.
- **slides**: four-slide Nano Banana Pro carousel. Cheap. Goes to Instagram, Facebook, X.
- **image**: one generated still. Cheap. Same platforms as slides.
- **video**: a Veo clip. Priced per second of generated video and by far the most expensive.
  Goes everywhere, and is the only kind YouTube and TikTok accept.

Default to cards for the feed and reel for YouTube. Use Veo video when the subject needs motion, when the target is YouTube or
TikTok, or when the operator asked for a clip. The YouTube autopilot already makes a few
clips a day when `AUTOPILOT_ENABLED` is true; check `pipeline_status` before adding more.

## Disclosure

Generated media is labelled "Made with AI." automatically, and the networks get their own
AI flags. Do not strip it. An `original` post carries no label because nothing is synthetic.

## Cadence

- Rotate pillars: Health, Stealth, Wealth, never the same twice in a row.
- Instagram and Facebook: one to two posts a day is plenty.
- YouTube: leave headroom under the six-a-day quota for retries.
- Do not queue more than the operator can review. Three to five "ready" posts waiting is
  the ceiling; past that, write the ideas into the growth brief instead.
