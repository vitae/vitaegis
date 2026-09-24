# KeyCrate

Harmonic playlist builder at `/keycrate`. Code lives in `app/keycrate/` (UI, worker, routes) and
`lib/keycrate/` (pure logic, all unit-tested).

## How it works

- **Import**: `File → Export Collection in xml format` in rekordbox, then drop the file on the page. Parsing
  runs in a Web Worker (`app/keycrate/_lib/import.worker.ts`) so 20k+ tracks never block the UI. CSV with
  `artist, title, key, bpm, genre, duration` columns works too. Re-imports merge by TrackID (or
  artist+title+duration for CSV rows) and keep energy, tags and playlists.
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
- **Storage**: IndexedDB on the device for everything. Signing in (magic link) adds a cloud copy in
  Supabase, uploaded in chunks of 500.

## Env vars (Vercel)

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Already set. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New. The browser and the share page query as the user / anon so RLS applies. Without it KeyCrate is local-only and hides sign-in. |
| `KEYCRATE_ALLOWED_EMAILS` | Optional. Comma-separated emails allowed to sign in. Unset means anyone. |

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
