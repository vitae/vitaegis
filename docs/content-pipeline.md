# Content pipeline

iPhone Shortcut → Supabase → Gemini / Nano Banana Pro / Veo → your review → the five networks.

Everything is native: the site calls each platform's own API, so the content, the
timing and the credentials stay here. No third-party relay.

## Flow

1. **Capture.** The Shortcut posts a photo, clip, voice note or plain text to
   `POST /api/content/ingest` with an `x-ingest-key` header. The file lands in the
   private `content` bucket, a row lands in `content_ingest`, and a `caption` job is queued.
2. **Generate.** The cron worker picks the job up. Gemini looks at what you captured
   and writes per-platform copy plus prompts for the media models. **Veo is the default**,
   so most posts come out as a clip. The post moves to `ready`.
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
| `NEXT_PUBLIC_BASE_URL` | `https://www.vitaegis.com`. The apex redirects to www, and OAuth callbacks must match exactly. |
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
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account that archives media to Drive. Optional. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | That account's private key, the whole PEM block. |
| `GDRIVE_FOLDER_ID` | Destination folder id, from its Drive URL. |
| `YOUTUBE_PRIVACY` | Defaults to `public`. Use `private` while testing. |

### 3. Connect the accounts

Open each of these once and approve:

```
https://www.vitaegis.com/api/social/connect/facebook?key=<CONTENT_ADMIN_KEY>
https://www.vitaegis.com/api/social/connect/youtube?key=<CONTENT_ADMIN_KEY>
https://www.vitaegis.com/api/social/connect/tiktok?key=<CONTENT_ADMIN_KEY>
https://www.vitaegis.com/api/social/connect/twitter?key=<CONTENT_ADMIN_KEY>
```

The Facebook grant also stores Instagram, since one Meta app covers both. The dots on
`/admin/content` show what is connected.

To check your progress at any point, open
`https://www.vitaegis.com/api/content/status?key=<CONTENT_ADMIN_KEY>`. It reports which
variables are set, whether the tables and bucket exist, which accounts are connected,
and the exact callback URL to paste into each provider. It never returns a secret value.

### 4. The Shortcut

New Shortcut, one action: **Get Contents of URL**.

- URL: `https://www.vitaegis.com/api/content/ingest`
- Method: POST
- Headers: `x-ingest-key` = your `CONTENT_INGEST_SECRET`
- Request body: Form
  - `file` = Shortcut Input (photo, video or recording)
  - `note` = Ask For Input, or a dictated text action

Add it to the share sheet so you can send straight from Photos.

**What the note decides.** Your own footage posts as-is by default, which costs
nothing to generate and needs no AI label. Generation is opt-in by keyword:

| Word in the note | What posts | Needs Google billing |
| --- | --- | --- |
| nothing in particular | the photo or clip you sent, with AI captions | no |
| `veo`, `generate`, `render` | a Veo clip | yes |
| `slides`, `carousel`, `deck` | a four-slide Nano Banana Pro deck | yes |
| `illustrate`, `artwork` | one generated still | yes |

Generated media requires billing on the Google Cloud project behind `GEMINI_API_KEY`.
Text generation works on the free tier; image and video do not.

Slides are square 1:1, written as a set so they read as one deck: hook, two slides of
substance, takeaway. Instagram takes up to ten and crops them all to the first one's
aspect ratio. X takes the first four. YouTube and TikTok are video-only, so a photo
post skips them automatically.

## Drive archive

Every generated still, slide and clip is also copied to Google Drive, so you keep an
archive outside Supabase. It is best effort: if Drive fails the post still goes ahead.

Set it up once:

1. In Google Cloud, create a service account and download a JSON key.
2. Enable the Google Drive API on that project.
3. Put the account's `client_email` in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and its
   `private_key` in `GOOGLE_SERVICE_ACCOUNT_KEY`, newlines and all.
4. **Share the destination Drive folder with that email as Editor.** A service account
   has no Drive of its own, so without this every upload fails with a permission error.
5. Put the folder id, the part of its URL after `/folders/`, in `GDRIVE_FOLDER_ID`.

Files are named `YYYY-MM-DD-subject-kind.ext`, with slides numbered `1of4` and so on.

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
Since it is now the default, price out a realistic week before you lean on it. Stills
through Nano Banana Pro and copy through Gemini are cheap by comparison, so a day of
`slides` posts costs a fraction of a day of clips.

Vercel's cron runs every two minutes here. On Hobby, cron is limited to once a day, so
this needs a Pro project or you will have to trigger `/api/content/worker` yourself.
