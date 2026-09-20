# Content pipeline

iPhone Shortcut → Supabase → Gemini / Nano Banana Pro / Veo → your review → the five networks.

Everything is native: the site calls each platform's own API, so the content, the
timing and the credentials stay here. No third-party relay.

## Flow

1. **Capture.** The Shortcut posts a photo, clip, voice note or plain text to
   `POST /api/content/ingest` with an `x-ingest-key` header. The file lands in the
   private `content` bucket, a row lands in `content_ingest`, and a `caption` job is queued.
2. **Generate.** The cron worker picks the job up. Gemini looks at what you captured
   and writes per-platform copy plus prompts for the image and video models. Then
   either Nano Banana Pro makes a still or Veo makes a clip. The post moves to `ready`.
3. **Review.** `/admin/content`. Edit any caption, pick platforms, approve or reject.
   Nothing is published without this step.
4. **Publish.** Approval queues a `publish` job that calls each network directly.
   Per-platform results are recorded as they land, so a retry only picks up what failed.

Jobs live in `content_jobs` and are advanced by `/api/content/worker`, driven by the
cron in `vercel.json`. Veo takes minutes, far longer than a function will live, so the
render is polled across ticks rather than awaited in one request.

## One-time setup

### 1. Database

Run `supabase/migrations/create_content_pipeline.sql` in the Supabase SQL editor. It
creates the tables, the private `content` bucket, and `social_accounts`. Every table is
service-role only.

### 2. Environment variables

On Vercel and in `.env.local`:

| Variable | What it is |
| --- | --- |
| `CONTENT_INGEST_SECRET` | Shared secret the Shortcut sends. Generate something long. |
| `CONTENT_ADMIN_KEY` | Unlocks `/admin/content` and the connect links. |
| `CONTENT_MEDIA_SECRET` | Optional. Token on the media proxy URL. Falls back to the ingest secret. |
| `CRON_SECRET` | Vercel sets this for you; the worker checks it. |
| `GEMINI_API_KEY` | From Google AI Studio. Covers text, images and Veo. |
| `GEMINI_TEXT_MODEL` | Optional override, defaults to `gemini-2.0-flash`. |
| `GEMINI_IMAGE_MODEL` | Optional override, defaults to `gemini-3-pro-image-preview`. |
| `GEMINI_VIDEO_MODEL` | Optional override, defaults to `veo-3.1-generate-preview`. |
| `META_APP_ID`, `META_APP_SECRET` | Meta app, covers Facebook and Instagram. |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud OAuth client for YouTube. |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok developer app. |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | X app, OAuth 2.0 with PKCE. |
| `TIKTOK_PRIVACY` | Defaults to `SELF_ONLY`. Change once the app is approved. |
| `YOUTUBE_PRIVACY` | Defaults to `public`. Use `private` while testing. |

### 3. Connect the accounts

Open each of these once and approve:

```
/api/social/connect/facebook?key=<CONTENT_ADMIN_KEY>
/api/social/connect/youtube?key=<CONTENT_ADMIN_KEY>
/api/social/connect/tiktok?key=<CONTENT_ADMIN_KEY>
/api/social/connect/twitter?key=<CONTENT_ADMIN_KEY>
```

The Facebook grant also stores Instagram, since one Meta app covers both. The dots on
`/admin/content` show what is connected.

### 4. The Shortcut

New Shortcut, one action: **Get Contents of URL**.

- URL: `https://vitaegis.com/api/content/ingest`
- Method: POST
- Headers: `x-ingest-key` = your `CONTENT_INGEST_SECRET`
- Request body: Form
  - `file` = Shortcut Input (photo, video or recording)
  - `note` = Ask For Input, or a dictated text action

Add it to the share sheet so you can send straight from Photos. Put the word "reel",
"video" or "clip" in the note and the pipeline renders a Veo clip instead of a still.

## Platform notes

These are the things that actually bite:

- **Instagram** needs a Business or Creator account on a Facebook Page, plus app
  review for `instagram_content_publish`. Video posts go up as Reels and the container
  has to finish processing before it can be published, which the code waits on.
- **YouTube** charges 1600 quota units per upload against a default 10,000 a day, so
  roughly six uploads daily until you request more.
- **TikTok** only pulls media from a domain verified in your TikTok app, which is why
  media is served from `/api/content/media/[id]` on vitaegis.com rather than a Supabase
  signed URL. Until your app passes audit, posts land as `SELF_ONLY`.
- **X** requires a paid API tier to post at all.
- **AI disclosure** is on by default. Captions get a "Made with AI." line, TikTok gets
  `is_aigc`, X gets `made_with_ai`. Meta and YouTube expect the same disclosure, so
  leave it on unless a post has no generated media in it.

## Cost

Veo is priced per second of generated video and is by far the most expensive part.
Price out a realistic week before you lean on it. Stills through Nano Banana Pro and
copy through Gemini are cheap by comparison.

Vercel's cron runs every two minutes here. On Hobby, cron is limited to once a day, so
this needs a Pro project or you will have to trigger `/api/content/worker` yourself.
