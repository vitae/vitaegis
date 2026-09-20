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

## Deploy note

A Stop hook (`.claude/hooks/auto-commit-push.js`) commits and pushes every
working-tree change after each Claude Code turn. Anything not gitignored goes to
GitHub, so keep private material inside `PROJECTS/` or `.claude/`.
