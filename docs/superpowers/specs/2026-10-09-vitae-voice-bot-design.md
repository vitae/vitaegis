# Vitae: the voice of Vitaegis

Date: 2026-10-09. Status: approved design, awaiting implementation plan.

## Purpose

Visitors to vitaegis.com can tap a button, talk to Vitae, and hear it answer in Anthony's
cloned voice. Vitae knows the Language of Vitae, the three pillars, the books, the store and
the site, and can open a page, start a checkout, or subscribe an email when asked.

Success: a visitor on any page starts a conversation in one tap, gets spoken answers in the
cloned voice within about a second of finishing a sentence, and can say "take me to the
stealth manual", "I want the matcha" or "sign me up with my email" and have it happen.

## Decisions already made

- Hosted on the ElevenLabs Agents Platform (approach A). ElevenLabs runs speech to text, the
  model, text to speech, interruptions and turn-taking over WebRTC. The site mints tokens
  and runs the actions.
- Vitae can answer, guide and sell. It cannot delete anything, pay, or leave the site.
- The agent's configuration lives in the repo and is pushed by a sync script, so Vitae's
  brain stays in git.
- Model: Claude Sonnet, selected in the ElevenLabs agent configuration.
- Voice: an ElevenLabs clone of Anthony's voice. Anthony records the sample. It is uploaded
  either in the ElevenLabs dashboard (then `ELEVENLABS_VOICE_ID` is set by hand) or by
  dropping the audio in `PROJECTS/VITAE/voice/` and running `npm run vitae:voice`, which
  creates the clone and prints the id.
- No transcripts, audio or conversation history are stored by the site. ElevenLabs keeps
  them under its own retention settings. The only data the site stores is subscriber emails.

## Components

### 1. `lib/vitae/` (pure, tested)

- `persona.ts`: builds the system prompt. Composes `VITAE_VOICE` from `lib/voice.ts` with a
  persona block: Vitae is the voice of Vitaegis, calm and precise, speaks as Vitae (never
  claims to be Anthony), keeps answers to one to three spoken sentences, offers the next
  step, and uses the three tools only when the visitor asks for the action. Includes the
  rule that before `start_checkout` it says the product name and price and waits for a yes.
- `knowledge.ts`: builds the knowledge base documents from repo data, each as
  `{ name, text }`:
  - one document per pillar from `lib/pillars.ts` (doctrine, summary, directives, protocol,
    dossier titles and briefs, related pages);
  - the books canon from the `books` list in `app/books/page.tsx`, moved to
    `lib/books.ts` so the page and the knowledge builder share it;
  - the store from `lib/store.ts` with the single price;
  - the /secrets offer (what it is, price, one year of access);
  - a site map: every top-level page with its path and a one-line description, kept as a
    literal list in `lib/vitae/sitemap.ts`.
- `tools.ts`: the three tool definitions (name, description, JSON parameter schema) in the
  shape ElevenLabs expects for client tools, plus validators used by the browser before a
  tool runs:
  - `open_page({ path })`: `path` must match an entry in the site map allowlist;
  - `start_checkout({ product })`: `product` is a store id from `lib/store.ts` or the
    literal `secrets`;
  - `subscribe_email({ email })`: a plain email shape check.
- `agent-config.ts`: assembles the full ElevenLabs agent payload (name "Vitae", prompt,
  model, voice id, tools, knowledge base ids, first message, language, maximum session
  length of 600 seconds).

### 2. `scripts/vitae-sync.ts` and `scripts/vitae-voice.ts`

Run with `npx tsx`, exposed as `npm run vitae:sync` and `npm run vitae:voice`.

`vitae:sync`:

1. Reads `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, optional `ELEVENLABS_AGENT_ID`.
2. Uploads each knowledge document as a text knowledge-base item, replacing items with the
   same name from a previous run (lookup by name, delete, re-create).
3. If no agent id: creates the agent and prints the id to set in Vercel. Otherwise patches
   the existing agent with the full configuration.
4. Prints a summary: agent id, voice id, number of documents, tools.

`vitae:voice`: uploads every audio file in `PROJECTS/VITAE/voice/` as an instant voice
clone named "Vitae" and prints the voice id. It refuses to run if the folder is empty.

### 3. `app/api/vitae/token/route.ts`

`POST`, no body. Refuses when the `Origin` header is present and not one of the site's
origins (reusing the allowlist in `lib/keycrate/public-origin.ts`). Returns `503` with
`{ error }` when `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID` is unset. Otherwise asks
ElevenLabs for a WebRTC conversation token for the agent and returns `{ token }`. Never
caches. The API key never reaches the browser.

### 4. `app/api/subscribe/route.ts` and the `subscribers` table

`POST { email }`. Validates the email shape, lowercases it, upserts into a new Supabase
table `subscribers (email text primary key, source text, created_at timestamptz default
now())` with the service role, and returns `{ ok: true }`. Duplicate emails return
`{ ok: true }` too. `source` is `vitae` or `home`. Migration file in `supabase/migrations/`,
with row level security enabled and no policies, so only the service role reads or writes.
The home page Subscribe button posts to this route and shows "You're in." on success.

### 5. `components/VitaeOrb.tsx` and `components/VitaeConversation.tsx`

`VitaeConversation` is the client component that owns the session. It uses
`@elevenlabs/react`'s `useConversation` with the three client tools wired to browser
actions:

- `open_page`: validate, then `router.push(path)`;
- `start_checkout`: validate, then `POST /api/checkout { id, origin }` for store products
  or `POST /api/secrets/checkout { origin }` for secrets, and `window.location.assign(url)`;
- `subscribe_email`: validate, then `POST /api/subscribe { email, source: 'vitae' }`.

Each tool returns a short string result that the model speaks ("Opening the stealth
manual.", "Sending you to checkout for Tai Chi Flow at $9.99.", "You're in."). On failure
the tool returns the failure as text so Vitae can apologise and give the page path.

Starting a session: fetch `POST /api/vitae/token`, then `startSession({ conversationToken,
connectionType: 'webrtc' })`. The mic permission prompt happens here, only on tap.

`VitaeOrb` is the floating control, mounted in the root layout so it is on every page
except `/vitae` itself. It renders nothing when `NEXT_PUBLIC_VITAE_ENABLED` is not `1`
(set in Vercel once the agent exists). Glass-panel disc above the bottom nav, bottom right,
inside the safe area. States: idle (green rim), connecting (pulse), listening (pulse),
speaking (glow), error (one line of text and a retry). Expanded, it shows the last
transcript line and an end button. Transcript lines come from the SDK's message events.

### 6. `app/vitae/page.tsx`

A standalone page on the home rhythm (shell `max-w-screen-md px-4 sm:px-6`, section
`py-10 sm:py-14`, `SectionTitle as="h1"` "Vitae" with a tagline). Hosts
`VitaeConversation` at full size with the session's transcript list. When
`NEXT_PUBLIC_VITAE_ENABLED` is unset it shows a quiet "Vitae is being tuned. Soon." card.

## Data flow

1. Tap orb → `POST /api/vitae/token` → `{ token }`.
2. SDK opens WebRTC to ElevenLabs with the token; ElevenLabs loads the Vitae agent.
3. Visitor speaks; ElevenLabs transcribes, runs Claude with the prompt and knowledge, and
   streams the reply in the cloned voice.
4. When Claude calls a tool, ElevenLabs sends the call to the browser; the SDK runs our
   handler; the handler validates, acts, and returns a string; Vitae speaks it.
5. End button or ten-minute cap closes the session.

## Failure modes

| Situation                                     | Behaviour                                                  |
| --------------------------------------------- | ---------------------------------------------------------- |
| Env unset                                     | Orb absent; `/vitae` shows the "soon" card                 |
| Token route fails or ElevenLabs down          | Orb shows "Vitae is away. Try again." and a retry         |
| Mic permission denied                         | Orb shows "Microphone blocked." with no retry loop         |
| Network drops mid-session                     | SDK disconnect event → orb returns to idle with one line   |
| Tool validation fails (bad path, product, id) | Tool returns the problem; Vitae offers the right option    |
| Checkout or subscribe route fails             | Tool returns the problem and the page path as fallback     |
| Session hits ten minutes                      | ElevenLabs ends it; orb returns to idle                    |

## Cost and abuse controls

- Session cap of 600 seconds, set in the agent configuration.
- Token route refuses cross-origin requests.
- A usage alert is set in the ElevenLabs dashboard at a monthly minute budget Anthony
  chooses. Nothing in the code meters usage.

## Testing

Unit tests (vitest, `lib/**/*.test.ts`):

- `persona.test.ts`: prompt contains the voice rules, the persona rules and the checkout
  confirmation rule.
- `knowledge.test.ts`: one document per pillar, books, store, secrets and site map; every
  site map path starts with `/`; store document carries the single price.
- `tools.test.ts`: validators accept good input and reject paths outside the allowlist,
  unknown products and malformed emails.
- `subscribe.test.ts`: email normalisation and validation helper used by the route.

Browser verification before shipping: orb renders on home and a pillar page, `/vitae`
renders, a real conversation starts and answers in the cloned voice, each tool fires once
(`open_page` navigates, `start_checkout` reaches Stripe Checkout, `subscribe_email` writes a
row), and the env-unset state hides the orb.

## Configuration

| Variable                    | Where         | Purpose                                      |
| --------------------------- | ------------- | -------------------------------------------- |
| `ELEVENLABS_API_KEY`        | Vercel, local | Token route and sync scripts                 |
| `ELEVENLABS_VOICE_ID`       | Vercel, local | The cloned voice, set after `vitae:voice`    |
| `ELEVENLABS_AGENT_ID`       | Vercel, local | The agent, set after the first `vitae:sync`  |
| `NEXT_PUBLIC_VITAE_ENABLED` | Vercel        | `1` turns the orb and `/vitae` on            |
| Supabase URL and service key| existing      | Subscribers table                            |

New dependency: `@elevenlabs/react`. Nothing else.

## Out of scope

Narration of content, a livestream or Discord co-host, storing transcripts, a custom LLM
endpoint (approach C), multiple languages, and any change to the eve operator agent.

## Rollout

1. Anthony: ElevenLabs account on a plan with voice cloning and agents; API key into
   Vercel and `.env.local`; record the voice sample.
2. `npm run vitae:voice` (or dashboard upload) → `ELEVENLABS_VOICE_ID`.
3. `npm run vitae:sync` → `ELEVENLABS_AGENT_ID`.
4. Apply the `subscribers` migration.
5. Set `NEXT_PUBLIC_VITAE_ENABLED=1` in Vercel, redeploy.
6. Browser verification, then live.
