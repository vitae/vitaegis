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
