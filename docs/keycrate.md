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
  - **Google Drive**: WAVs in the folder named by `KEYCRATE_DRIVE_FOLDER_ID`, shared (Viewer) with the site's
    service account. `/api/keycrate/audio` lists it and `/api/keycrate/audio/[id]` streams one file in 8 MB byte
    ranges, so seeking works without downloading the whole WAV. Only signed-in users on `KEYCRATE_ALLOWED_EMAILS`
    can list or stream.
  - **USB / local folder**: pick the folder; files play straight from the drive and nothing is uploaded.
    Chrome and Edge remember the folder between visits; other browsers ask each visit. Local files win when both
    have a track, so a gig doesn't depend on the network.
- **Playlist → rekordbox**: the Playlist table under the wheel has Save and **rekordbox XML**. The export keeps
  TrackIDs and file paths and writes keys the way rekordbox reads them (`Am`, `F#m`, `C`). In rekordbox:
  Preferences → Advanced → rekordbox xml → Imported Library → pick the file, then drag the playlist from the
  rekordbox xml tree into your playlists.
- **Storage**: IndexedDB on the device for everything. Signing in (magic link) adds a cloud copy in
  Supabase, uploaded in chunks of 500. If IndexedDB is blocked or hangs (private browsing, in-app browsers,
  another tab holding an old version), the page carries on in memory and shows a red notice instead of
  sitting on "Opening your crate…".

## Env vars (Vercel)

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Already set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New. The browser and the share page query as the user / anon so RLS applies. Without it KeyCrate is local-only and hides sign-in. |
| `KEYCRATE_ALLOWED_EMAILS` | Comma-separated emails allowed to sign in. Unset means anyone can sign in, but Google Drive audio then streams to nobody: streaming needs your email here. |
| `KEYCRATE_DRIVE_FOLDER_NAME` | Optional. Name of the shared Drive folder with the music; defaults to `USB`. |
| `KEYCRATE_DRIVE_FOLDER_ID` | Optional. Pins one folder by id (`drive.google.com/drive/folders/<id>`) instead of finding it by name. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` (or `_EMAIL` + `_KEY`) | Already set for the content pipeline; KeyCrate reuses it read-only. |

### Google Drive audio

1. Put the music in a Drive folder named **USB** (subfolders are fine, e.g. a copy of the USB `Contents`
   folder). Another name works with `KEYCRATE_DRIVE_FOLDER_NAME`, or pin one folder with
   `KEYCRATE_DRIVE_FOLDER_ID`.
2. Share that folder as **Viewer** with the site's service account,
   `vitaegis@gen-lang-client-0892329659.iam.gserviceaccount.com` (the `client_email` in
   `GOOGLE_SERVICE_ACCOUNT_JSON`). Until it's shared, `/keycrate` shows this address in red under the Drive chip.
3. Make sure `KEYCRATE_ALLOWED_EMAILS` includes your email, then sign in on `/keycrate`: the Drive chip lists the
   folder (re-checked every 10 minutes, no redeploy needed) and the ▶ buttons light up.

## Supabase

1. Authentication → Providers → Email: enabled (magic link).
2. Authentication → URL Configuration → Redirect URLs: add `https://vitaegis.com/keycrate` and the preview
   pattern `https://*-vitae.vercel.app/keycrate`.
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
