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
- **Engine** (`lib/keycrate/harmonic.ts`): classifies each move as same / perfect 5th / relative / diagonal /
  energy boost / semitone lift / third / clash. Tempo matches beyond ±3% shift the key by whole
  semitones (+7 on the wheel per semitone) unless key lock is on. BPM matches allow ±6% (adjustable) plus
  half- and double-time.
- **Modes** (`lib/keycrate/suggest.ts`): Smooth, Dramatic (one dramatic move per N tracks) and Journey
  (rank by fit to an energy and BPM curve).
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
  aren't read yet. Importing a rekordbox XML later replaces these rows with the real ones for the same files and
  moves playlists over.
- **Playlist → rekordbox**: the Playlist table under the wheel has Save and **rekordbox XML**. The export keeps
  TrackIDs and file paths and writes keys the way rekordbox reads them (`Am`, `F#m`, `C`). In rekordbox:
  Preferences → Advanced → rekordbox xml → Imported Library → pick the file, then drag the playlist from the
  rekordbox xml tree into your playlists.
- **Storage**: IndexedDB on the device for everything. Signing in with Google adds a cloud copy in
  Supabase, uploaded in chunks of 500. If IndexedDB is blocked or hangs (private browsing, in-app browsers,
  another tab holding an old version), the page carries on in memory and shows a red notice instead of
  sitting on "Opening your crate…".

## Env vars (Vercel)

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Already set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New. The browser and the share page query as the user / anon so RLS applies. Without it KeyCrate is local-only and hides sign-in. |
| `KEYCRATE_ALLOWED_EMAILS` | Comma-separated Google account emails allowed to sign in (others are signed straight back out). Unset means anyone can sign in, but Google Drive audio then streams to nobody: streaming needs your email here. |
| `KEYCRATE_DRIVE_FOLDER_NAME` | Optional. Name of the shared Drive folder with the music; defaults to `USB`. |
| `KEYCRATE_DRIVE_FOLDER_ID` | Optional. Pins one folder by id (`drive.google.com/drive/folders/<id>`) instead of finding it by name. |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | The same OAuth client as Supabase's Google provider. Needed for "Sign in to Google Drive": the server refreshes Drive access with it and encrypts the token cookie. |
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
2. Authentication → URL Configuration → Redirect URLs: add `https://www.vitaegis.com/keycrate`,
   `https://vitaegis.com/keycrate`, `https://www.vitaegis.com/keycrate/study` and the preview pattern
   `https://*-vitae.vercel.app/keycrate/**`.
3. Run `supabase/migrations/20260924120000_keycrate.sql` in the SQL editor. It creates `kc_tracks`,
   `kc_playlists`, `kc_playlist_items` and `kc_set_studies` with RLS scoped to `auth.uid()`, plus anon
   read policies for playlists marked public.

## Checks

```sh
npm run typecheck
npm run lint
npm test            # Vitest: 24-key table, transitions, pitch math, BPM half/double, tracklists, imports, exports
npm run test:e2e    # Playwright: import fixtures/keycrate-sample.xml, build a 5-track set, export XML
```

`fixtures/keycrate-sample.xml` is a 24-track rekordbox export used by the tests and by "Load sample library"
on the page (served from `/api/keycrate/sample`).
