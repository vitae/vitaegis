# KeyCrate

Harmonic playlist builder at `/keycrate`. Code lives in `app/keycrate/` (UI, worker, routes) and
`lib/keycrate/` (pure logic, all unit-tested).

## How it works

- **Import**: `File → Export Collection in xml format` in rekordbox, or Traktor's `collection.nml`, or a CSV
  with `artist, title, key, bpm, genre, duration` columns. Pick the file or drop it anywhere on the page; the
  format is read from the content (`lib/keycrate/library.ts`), so the file name and extension don't matter.
  Parsing runs in a Web Worker (`app/keycrate/_lib/import.worker.ts`) so 20k+ tracks never block the UI; if
  the worker can't run in that browser, it parses on the page instead. Re-imports merge by TrackID (or
  artist+title+duration for Traktor and CSV rows) and keep energy, tags and playlists. Files that aren't a
  DJ library (an iTunes XML, say) get an error that says what to export instead.
- **Keys**: every spelling (`Am`, `A min`, `A minor`, `8A`, Open Key `1m`, `D#m` = `Ebm` = `2A`) is
  normalised to Camelot in `lib/keycrate/camelot.ts`.
- **Engine** (`lib/keycrate/harmonic.ts`, maths in `lib/keycrate/theory.ts`): classifies each move as same /
  perfect 5th / relative / parallel / diagonal / energy boost / semitone lift / third / chromatic / clash, and
  names it with its maths and mood (see *Harmonic moves and mood* below). Tempo matches beyond ±3% shift the key by whole
  semitones (+7 on the wheel per semitone) unless key lock is on. BPM matches allow ±6% (adjustable) plus
  half- and double-time.
- **Modes** (`lib/keycrate/suggest.ts`, `lib/keycrate/modes.ts`): Smooth (rank by consonance), Dramatic (one
  dramatic move per N tracks, rank by controlled contrast), Journey (fit to an energy and BPM curve, brightness
  steered with the curve), and three set-type profiles, Downtempo, Uptempo and Ambient (see *Set-type modes*).
- **Set Study** (`/keycrate/study`, `lib/keycrate/tracklist.ts`): paste any tracklist, fuzzy-match it to the
  library, read the transitions, and "Build similar from my crate".
- **Exports** (`lib/keycrate/export.ts`): rekordbox playlist XML (TrackIDs, so cues survive re-import),
  M3U8 from `Location`, CSV, and a read-only share link at `/keycrate/set/[id]`.
- **Audio** (`app/keycrate/_state/audio.tsx`, `lib/keycrate/audio.ts`, `lib/keycrate/drive-audio.ts`): a ▶ next to
  every track in the library, the Playlist table, the set and Set Study, with a player bar for seeking. Tracks are
  matched to files by the file name in the library's Location, then by "Artist - Title" in the file name.
  - **Google Drive**: **Sign in to Google Drive** (the chip next to the USB button) signs in with Google and
    asks for read-only Drive access. KeyCrate then plays the folder named `USB` (or `KEYCRATE_DRIVE_FOLDER_NAME`)
    in *your* Drive; nothing needs sharing. The Google tokens live in an encrypted httpOnly cookie
    (`lib/keycrate/google-user.ts`) and the server refreshes them. Without that login it falls back to a folder
    shared (Viewer) with the site's service account. `/api/keycrate/audio` lists the folder, many subfolders per
    Drive query (`lib/keycrate/drive-walk.ts`), and `/api/keycrate/audio/[id]` streams one file in 8 MB byte
    ranges, so seeking works without downloading the whole WAV. Only signed-in users on
    `KEYCRATE_ALLOWED_EMAILS` can list or stream.
  - **USB / local folder**: pick the folder; files play straight from the drive and nothing is uploaded.
    Chrome and Edge remember the folder between visits; other browsers ask each visit. Local files win when both
    have a track, so a gig doesn't depend on the network.
- **Songs from a linked folder** (`lib/keycrate/file-tracks.ts`, `lib/keycrate/tags.ts`): linking USB or Drive
  adds a library track for every audio file no track plays yet: artist and title from `Artist - Title.wav`, key
  and BPM from a Mixed In Key style name (`8A - 124 - Artist - Title`), then from the file's ID3 tag (MP3, or the
  `id3 ` chunk of a WAV / AIFF), read in the background with a few small byte ranges per file. FLAC and M4A tags
  aren't read yet. Tracks still missing a key or BPM that play from an uncompressed WAV are then analysed
  (`lib/keycrate/analysis.ts`, in `app/keycrate/_lib/analyze.worker.ts`): ~30 s from 35% into the song, spectral
  flux + autocorrelation for BPM, a chromagram against Krumhansl key profiles for the key. Detected tracks get
  `keyRaw: 'detected'`; files that can't be analysed get `kc:undetected` and aren't retried. On Drive each song
  costs one ~5–8 MB range. Importing a rekordbox XML later replaces these rows with the real ones for the same files and
  moves playlists over.
- **Playlist → rekordbox**: the Playlist table under the wheel has Save and **rekordbox XML**. The export keeps
  TrackIDs and file paths and writes keys the way rekordbox reads them (`Am`, `F#m`, `C`). In rekordbox:
  Preferences → Advanced → rekordbox xml → Imported Library → pick the file, then drag the playlist from the
  rekordbox xml tree into your playlists.
- **Storage**: IndexedDB on the device for everything. Signing in with Google adds a cloud copy in
  Supabase, uploaded in chunks of 500. If IndexedDB is blocked or hangs (private browsing, in-app browsers,
  another tab holding an old version), the page carries on in memory and shows a red notice instead of
  sitting on "Opening your crate…".

## Harmonic moves and mood

Every key is a tonic pitch class (C = 0 … B = 11) plus major or minor (`keyOf` reads it from Camelot: `8B` is
C, each step clockwise is +7 semitones, `nA` is three semitones below `nB`). The move into the next track is
read from the *effective* key, after any tempo-match pitch shift when key lock is off.

- **Δ** = (tonic₂ − tonic₁) mod 12, the tonic interval. **Fifths** = 7·Δ mod 12 (7 is its own inverse mod 12).
- **Signature shift D**: key signatures on the circle of fifths, minor keys via their relative major; + is
  clockwise (sharpward).
- **Common tones**: pitch classes the two diatonic scales share (7 − |D| up to 5 fifths, 2 at the tritone) and
  the two tonic triads share (0–3).
- **Neo-Riemannian word**: the shortest P/L/R path between the tonic triads, by breadth-first search
  (P = parallel, R = relative, L = leading-tone exchange; each keeps two chord tones). Applied left to right.
- **Tension** 0–10 = 5.5·(7 − scale)/5 + 3·(3 − triad)/3 + 1.5·(tonic-interval roughness). Only the tritone
  reaches 10.
- **Brightness** = D (the tritone, ±6, counts as 0) + 1 for minor → major, −1 for major → minor.
- **Mood** label: from the move family, then brightness (brighter = lift, darker = release/settle); intensity
  from max(|brightness|/6, tension/10).

| Move (from C / Am) | Maths | Mood |
| --- | --- | --- |
| Same key | 3/3 chord, 7/7 scale | Steady |
| Relative (R) C↔Am | 2/3, 7/7, D 0 | ±1: brighter to major, darker to minor |
| Leading-tone exchange (L) C→Em, Am→F | 2/3, 6/7 | Level · colour shift |
| Dominant / subdominant (LR / RL) | ±1 fifth, 1/3, 6/7 | Brighter · open / darker · settle |
| Parallel (P) Am→A, C→Cm | same tonic, 2/3, 4/7, D ±3 | Brighter · Picardy lift (+4) / darker (−4) |
| Diagonal ii / ♭VII (C→Dm, Am→G) | ±1 fifth + mode swap, 0/3, 6/7 | ±2 |
| Whole-tone lift / drop (energy boost) | ±2 fifths, 5/7 | Brighter · lift / darker · release |
| Chromatic mediants ↑↓ m3 / M3 (PR, RP, LP, PL) | same mode, 1/3, 3–4/7 | Cinematic shift, ±3 or ±4 |
| Slide (S = LPR), Nebenverwandt (N = RLP) | mode swap, 1/3 shared | Cinematic shift |
| Hexatonic pole (H = PLP) C→Abm | 0/3, 2/7 | Cinematic shift, extreme |
| Semitone lift / drop | 0/3, 2/7, D ∓5 | Energy lift · gear change / energy drop |
| Tritone | 0/3, 2/7, D 6 | Tension · maximum distance |

Parallel is a Smooth move (same root); Slide, N and the hexatonic pole are Dramatic (`chromatic`). The
Suggestions panel shows, per pick, the move name, the mood with ☀/☾ brightness and T tension, and the maths
line (`L · tonic +4 st · +1 fifth · chord 2/3 · scale 6/7`: chord tones and scale notes shared); the set and Playlist table show the
move and mood on each transition.

## Set-type modes

Profiles in `lib/keycrate/modes.ts`, tuned on a study of 36 Tipper live sets (tempo pockets, energy by set
type, mood-shift rates, time between track changes). Energy is the track's 1–10 tag, else a tempo proxy
(60 BPM ≈ 0, 170 ≈ 1). Tempo pockets fold half- and double-time.

| Mode | Tempo pocket | Energy | Mood shift | Favoured moves | Other |
| --- | --- | --- | --- | --- | --- |
| Downtempo | 70–100 | 0.3–0.5 | 1 per 15 tracks (thirds, chromatic, boosts, semitones) | relative, same, ±1, mediants for colour | small tempo steps; ~3.4 min per track |
| Uptempo | 128–150 | 0.7–0.9 | 1 per 30 (thirds, chromatic) | ±1, semitone lift, energy boost | +bonus for a 1–8% upward tempo creep; ~86 s per track |
| Ambient | 60–100, barely weighted | 0.1–0.35 | 1 per 36 (thirds, boosts) | same, relative, parallel, ±1 | tolerance at least ±40%, beatless (no BPM) tracks allowed, brightness beyond ±1 penalised |

`kc_playlists.mode` needs `supabase/migrations/20260930130000_keycrate_modes.sql` for the new modes. Until it
is applied, a save with a new mode stores `journey` in that column and the real mode stays in `target_curve`.

## Paywall (24 hours free, then $3.33/month)

Off until it is configured: without `KEYCRATE_STRIPE_PRICE_ID`, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` all set,
`/api/keycrate/access` answers `enabled: false` and the app works exactly as it did before.

- **Rule** (`lib/keycrate/access.ts`, unit-tested): not signed in → `anonymous`; email on
  `KEYCRATE_FREE_EMAILS` → `active`; Stripe status `active` / `trialing` / `past_due` → `active`;
  otherwise `trial` for 24 hours from `trial_started_at`, then `expired`.
- **Server** (`lib/keycrate/access-server.ts`): `GET /api/keycrate/access` verifies the Supabase user
  (`Authorization: Bearer <access token>`, or the Supabase session cookie) and returns
  `{ enabled, state, trialEndsAt, canManage }`. The first call for a user inserts their `kc_access` row;
  that insert is the start of the free day. No card is asked for.
- **Client** (`app/keycrate/_components/AccessGate.tsx`, wraps `/keycrate` and `/keycrate/study`; the public
  share page `/keycrate/set/[id]` stays open): sign-in wall for `anonymous`, a banner with time left and
  Subscribe during the `trial`, a full-screen paywall when `expired` (the library stays in IndexedDB on
  the device), and a "Manage subscription" link (Stripe Customer Portal) when `active`. If the access check
  can't be reached (offline at a gig), the last answer this device saw is used; with none, the app stays open.
- **Stripe**: `POST /api/keycrate/checkout` creates a Checkout Session (`mode: subscription`, price
  `KEYCRATE_STRIPE_PRICE_ID`, the saved customer or the Google email, `client_reference_id` = Supabase user
  id, metadata `app: keycrate`) and returns to `/keycrate?subscribed=1`, where the page polls until the
  webhook lands. `POST /api/keycrate/portal` opens the Customer Portal.
- **Webhook**: the existing `/api/stripe-webhook` (`STRIPE_WEBHOOK_SECRET`) also handles
  `checkout.session.completed` and `customer.subscription.created` / `updated` / `deleted` for
  subscriptions tagged `app: keycrate` (`lib/keycrate/billing-webhook.ts`). It re-reads the subscription from
  Stripe and upserts `kc_access` with the service role; a failure returns 500 so Stripe retries.
- **Table**: `supabase/migrations/20260930120000_keycrate_access.sql` creates `kc_access` with RLS on. Users
  can only read their own row; only the service role writes.

### Turning it on

1. Supabase SQL editor: run `supabase/migrations/20260930120000_keycrate_access.sql`.
2. Stripe: create a product "KeyCrate" with a recurring price of $3.33/month; copy the price id (`price_…`).
3. Stripe → Developers → Webhooks: on the endpoint `https://www.vitaegis.com/api/stripe-webhook`, add
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and
   `customer.subscription.deleted`.
4. Stripe → Settings → Billing → Customer portal: turn it on (allow cancel and card updates).
5. Vercel: set `SUPABASE_SERVICE_ROLE_KEY` (if not already), `KEYCRATE_FREE_EMAILS`, and last
   `KEYCRATE_STRIPE_PRICE_ID`, then redeploy. Setting the price id is the switch.
6. `KEYCRATE_ALLOWED_EMAILS` signs out anyone not on it, which would lock strangers out of the trial.
   Unset it for a public paywall. Drive streaming then works for no one, because it also reads that list;
   to keep your own streaming, change `app/api/keycrate/signin/route.ts` to stop signing people out and
   leave the list only for `lib/keycrate/drive-audio.ts`.

## Env vars (Vercel)

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Already set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New. The browser and the share page query as the user / anon so RLS applies. Without it KeyCrate is local-only and hides sign-in. |
| `KEYCRATE_ALLOWED_EMAILS` | Comma-separated Google account emails allowed to sign in (others are signed straight back out). Unset means anyone can sign in, but Google Drive audio then streams to nobody: streaming needs your email here. |
| `KEYCRATE_DRIVE_FOLDER_NAME` | Optional. Name of the shared Drive folder with the music; defaults to `USB`. |
| `KEYCRATE_DRIVE_FOLDER_ID` | Optional. Pins one folder by id (`drive.google.com/drive/folders/<id>`) instead of finding it by name. |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | The same OAuth client as Supabase's Google provider. Needed for "Sign in to Google Drive": the server refreshes Drive access with it and encrypts the token cookie. |
| `KEYCRATE_STRIPE_PRICE_ID` | The $3.33/month Stripe price (`price_…`). Unset = paywall off. |
| `KEYCRATE_FREE_EMAILS` | Comma-separated emails that are always active (owner, comps). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Already set for the site's Stripe webhook; the paywall reuses them. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Writes `kc_access` (trial start, subscription). Paywall stays off without it. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` (or `_EMAIL` + `_KEY`) | Already set for the content pipeline; KeyCrate reuses it read-only. |

### Google Drive audio

1. Upload the USB's music to a folder named **USB** in your Google Drive (subfolders are fine, e.g. the whole
   `Contents` folder). Another name works with `KEYCRATE_DRIVE_FOLDER_NAME`.
2. Google Cloud (the project with the OAuth client): enable the **Google Drive API**, and on the OAuth consent
   screen add the `…/auth/drive.readonly` scope. Publish the app ("In production"). In "Testing", Google expires
   the login every 7 days. It stays unverified, so Google shows an "unverified app" screen: continue past it.
3. Vercel: set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and your email in
   `KEYCRATE_ALLOWED_EMAILS`.
4. On `/keycrate`, tap **Sign in to Google Drive** and allow Drive access. The chip lists the folder and the ▶
   buttons light up.

Fallback without the login: share the folder (Viewer) with the service account,
`vitaegis@gen-lang-client-0892329659.iam.gserviceaccount.com`, or pin it with `KEYCRATE_DRIVE_FOLDER_ID`.

## Supabase

1. Authentication → Providers → Google: enabled, with the OAuth client ID and secret from Google Cloud
   (APIs & Services → Credentials → OAuth client ID → Web application). That client's **Authorized redirect
   URI** is `https://fsrxacvcqftelbjdqlnm.supabase.co/auth/v1/callback`.
2. Authentication → URL Configuration → Redirect URLs: add `https://www.glowwitdaflow.com/keycrate`, `https://www.glowwitdaflow.com/keycrate/study`, `https://www.vitaegis.com/keycrate`,
   `https://vitaegis.com/keycrate`, `https://www.vitaegis.com/keycrate/study` and the preview pattern
   `https://*-vitae.vercel.app/keycrate/**`.
3. Run `supabase/migrations/20260924120000_keycrate.sql` in the SQL editor (and
   `20260930120000_keycrate_access.sql` for the paywall, `20260930130000_keycrate_modes.sql` for the
   Downtempo / Uptempo / Ambient modes). It creates `kc_tracks`,
   `kc_playlists`, `kc_playlist_items` and `kc_set_studies` with RLS scoped to `auth.uid()`, plus anon
   read policies for playlists marked public.

## Checks

```sh
npm run typecheck
npm run lint
npm test            # Vitest: access rule, 24-key table, transitions, pitch math, BPM half/double, tracklists, imports, exports
npm run test:e2e    # Playwright: import fixtures/keycrate-sample.xml, build a 5-track set, export XML
```

`fixtures/keycrate-sample.xml` is a 24-track rekordbox export used by the tests and by "Load sample library"
on the page (served from `/api/keycrate/sample`).
