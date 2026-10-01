# Whole Foods run (`/wholefoods`)

Grocery inventory, visit log and Route 14 bus tracker for the Kahala Whole Foods, at
[vitaegis.com/wholefoods](https://www.vitaegis.com/wholefoods).

## How it works

- **Inventory**: `lib/wholefoods-staples.ts` holds the staples (anything bought on three or more of
  the 46 Whole Foods orders on the account, Jan 2025 – Sep 2026) and every past visit. Each staple
  starts stocked; the red ✕ marks it out and puts it on the list. Out → In cart → Got it.
- **Visits**: "Finish visit" logs date, time, store/delivery, total and a note. The log merges those
  with the Amazon history (`visitLog` in `lib/wholefoods.ts`).
- **Amazon**: item buttons search the Whole Foods storefront on Amazon (`amazonSearchUrl`); checkout
  stays on Amazon.
- **Bus**: `app/api/thebus/route.ts` proxies the public HEA stop page
  (`hea.thebus.org/nextbus.asp?s=<stop>`) for stops 161 (Kalakaua Ave + Elks Club) and 218
  (Kilauea Ave + Waialae Ave) and returns Route 14 arrivals as JSON; no API key. The timetable in
  `lib/route14-schedule.json` comes from TheBus GTFS (`google_transit.zip`, feed 2608_v5, valid
  2026-08-09 to 2026-12-05). Regenerate it from a new feed when that expires.

## Sync across devices (Supabase)

State is saved in `localStorage` on every device. Signing in with Google turns on sync:

- `lib/wholefoods-cloud.ts` reads and writes one `wf_lists` row per user with the anon key as the
  signed-in user, and subscribes to realtime changes on that row.
- Merge rule (`mergeStates`): items come from whichever copy has the newer `updatedAt`; trips are the
  union of both. Every local change stamps `updatedAt` (`touch`). Saves are debounced 800 ms.

### Setup (one time)

1. Supabase SQL editor: run `supabase/migrations/20261001120000_wholefoods_lists.sql`. It creates
   `public.wf_lists` with owner-only RLS and adds it to the `supabase_realtime` publication.
2. Authentication → URL Configuration → Redirect URLs: add `https://www.vitaegis.com/wholefoods`
   and `https://vitaegis.com/wholefoods` (the preview pattern `https://*-vitae.vercel.app/**` if
   you want previews to sign in too).
3. Vercel already has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for KeyCrate;
   nothing new. Without them the page silently stays local-only.

## Checks

```sh
npm run typecheck
npm run lint
npm test   # lib/wholefoods.test.ts, lib/thebus.test.ts
```
