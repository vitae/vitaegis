# VITAEGIS

Next.js app for vitaegis.com, deployed on Vercel from this repo.

## Project research lives in `PROJECTS/`

`PROJECTS/` holds research, notes, and reference material from Claude projects,
one subfolder per project. It is gitignored and is never deployed.

- Before building a feature, check `PROJECTS/` for a matching subfolder and read
  its `NOTES.md` first.
- Treat `PROJECTS/` as read-only reference. Write shippable code in `app/`,
  `components/`, `public/`, or `supabase/`.
- Never import from or link to `PROJECTS/` in site code. The folder does not
  exist in the deployed build.

## The operator agent lives in `agent/`

An eve agent (Vercel's durable agent framework) mounted at `/eve/v1` by `withEve` in
`next.config.mjs`. Read `docs/agent.md` before touching it. Rules that must hold:

- Publishing and Stripe writes stay behind approval (`agent/lib/approval.ts`).
- Posts go through `queue_post` into the existing pipeline, never straight to a network.
- `npm run agent:info` must report 0 errors; `npm run test` covers `agent/lib`.

## Deploy note

A Stop hook (`.claude/hooks/auto-commit-push.js`) commits and pushes every
working-tree change after each Claude Code turn. Anything not gitignored goes to
GitHub, so keep private material inside `PROJECTS/` or `.claude/`.

## Shipping

Push live immediately. When a change passes typecheck, lint and tests, commit
it, push it, and merge it to `main` right away so Vercel deploys to production.
Do not wait for preview approval or leave PRs in draft.

## Vitae, the voice bot, lives in `lib/vitae/` and `components/vitae/`

Read `docs/vitae.md`. Its ElevenLabs configuration is pushed by `npm run vitae:sync`;
never edit the agent in the ElevenLabs dashboard, edit the repo and sync.

## Project guidelines for Claude Code

### Commands & checks

- **Build:** `npm run build`
- **Test:** `npm test` (Vitest; `npm run test:e2e` for Playwright)
- **Lint/Typecheck:** `npm run lint && npm run typecheck`
- **Rule:** ALWAYS run typecheck and tests before claiming a task is complete.
  Fix any regressions immediately.

### Architecture & conventions

- **Stack:** Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS,
  Supabase, Stripe, Vitest, Playwright. Deployed on Vercel.
- **Design patterns:** Functional React components in `components/`, App Router
  pages in `app/`, Route Handlers in `app/api/*/route.ts`, shared logic in `lib/`.
- **Style rules:**
  - Keep changes minimal, modular, and focused.
  - Do NOT add unnecessary code comments unless explicitly asked.
  - Follow existing idioms in the codebase.

### Workflow rules

- **Git:** NEVER automatically commit changes unless explicitly told to do so.
- **File management:** Always prefer editing existing files over creating new
  ones. Never commit or log secrets/API keys.
