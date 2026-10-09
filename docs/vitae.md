# Vitae, the voice of Vitaegis

Vitae is an ElevenLabs agent that speaks in Anthony's cloned voice from a floating orb on
every page and from /vitae. Its brain lives in this repo under `lib/vitae/` and is pushed
to ElevenLabs by `npm run vitae:sync`.

## Setup, once

1. ElevenLabs account on a plan with voice cloning and agents. Put `ELEVENLABS_API_KEY`
   in Vercel (Production) and `.env.local`.
2. Record one to three minutes of clean speech. Either upload it in the ElevenLabs
   dashboard as a voice named Vitae and copy the id, or drop the files in
   `PROJECTS/VITAE/voice/` and run `npm run vitae:voice`. Set `ELEVENLABS_VOICE_ID`.
3. `npm run vitae:sync`. Set `ELEVENLABS_AGENT_ID` to the printed id.
4. Apply `supabase/migrations/20261009120000_subscribers.sql` (already applied to the
   live project on 2026-10-09).
5. Set `NEXT_PUBLIC_VITAE_ENABLED=1` in Vercel and redeploy.
6. In the ElevenLabs dashboard, set a monthly usage alert.

## After changing the prompt, tools, pillars, books, store or site map

`npm run vitae:sync` again. Knowledge documents are replaced, tools are patched by name,
the agent is patched in place.

## What Vitae can do

Open a page on vitaegis.com, start a Stripe checkout for a store product or /secrets
after saying the name and price and hearing yes, and subscribe an email (stored in
`public.subscribers`). Nothing else. Sessions cap at ten minutes.

## Files

| Path                           | Role                               |
| ------------------------------ | ---------------------------------- |
| `lib/vitae/persona.ts`         | System prompt from `lib/voice.ts`  |
| `lib/vitae/knowledge.ts`       | Knowledge documents from repo data |
| `lib/vitae/tools.ts`           | Tool definitions and validators    |
| `lib/vitae/sitemap.ts`         | Pages Vitae may describe or open   |
| `lib/vitae/agent-config.ts`    | ElevenLabs agent payload           |
| `lib/vitae/elevenlabs.ts`      | REST client                        |
| `lib/vitae/sync-plan.ts`       | What a sync creates and replaces   |
| `lib/vitae/env.ts`             | Server and client enable flags     |
| `scripts/vitae-sync.ts`        | Push configuration to ElevenLabs   |
| `scripts/vitae-voice.ts`       | Create the voice clone             |
| `app/api/vitae/token/route.ts` | Single-use conversation tokens     |
| `app/api/subscribe/route.ts`   | Newsletter subscribe               |
| `components/vitae/`            | Conversation, tools hook, orb      |
| `app/vitae/page.tsx`           | The full-size page                 |
