# The operator agent

`agent/` is a durable AI agent built on [eve](https://eve.dev/docs), Vercel's filesystem-first
agent framework. It runs the business side of vitaegis.com: plans and queues content through
the existing pipeline, reads the research desk, watches revenue in Stripe, retries failed
jobs, and writes a growth brief every morning. Publishing and anything that moves money pause
for you.

It deploys with the site: `next.config.mjs` wraps the Next config in `withEve`, which mounts
the agent at `/eve/v1/*` on the same origin, boots it beside `next dev`, and ships it as a
sibling Vercel service with its schedules registered as Cron Jobs.

## Talk to it

- **Browser**: `/admin/agent`, behind the same admin key as the rest of `/admin`.
- **Terminal**: `npm run agent` opens the eve TUI against the local dev server.
- **HTTP**: `POST /eve/v1/session` with `x-admin-key`. See `agent/channels/eve.ts`.

## What it can do

| Tool                   | Effect                                                     | Approval            |
| ---------------------- | ---------------------------------------------------------- | ------------------- |
| `pipeline_status`      | Queue, failures, accounts, autopilot, configured services  | none                |
| `list_posts`           | Posts by status with captions and links                    | none                |
| `queue_post`           | New post through the pipeline, lands in review             | none                |
| `approve_post`         | Approve a ready post and publish it                        | **always**          |
| `reject_post`          | Mark a post rejected                                       | once per session    |
| `retry_job`            | Requeue a failed job                                       | none                |
| `research`             | Sources, findings, briefs from the research desk           | none                |
| `queue_research_brief` | Collate findings on a topic into a brief                   | none                |
| `growth_briefs`        | Read past growth briefs                                    | none                |
| `save_growth_brief`    | Save today's brief                                         | none                |
| `revenue_snapshot`     | Stripe gross, net, MRR, balance                            | none                |
| `social_accounts`      | Which networks are connected                               | none                |
| `ask_question`         | Ask you one question mid-turn                              | n/a                 |

Connections (MCP servers the model can search and call):

| Connection  | Needs                      | Policy                                            |
| ----------- | -------------------------- | ------------------------------------------------- |
| `stripe`    | `STRIPE_SECRET_KEY`        | reads free, every write pauses for approval       |
| `supabase`  | `SUPABASE_ACCESS_TOKEN`    | read-only server; SQL over the pipeline tables    |
| `posthog`   | `POSTHOG_PERSONAL_API_KEY` | reads free, writes pause                          |
| `firecrawl` | `FIRECRAWL_API_KEY`        | web reads, no gate                                |

The last three are optional: with the variable unset the connection is not offered.

Subagents: `copywriter` (Sonnet, brand voice baked in from `lib/voice.ts`) and `researcher`
(Sonnet, web search). Skills the model loads on demand: `content-strategy`, `monetization`,
`daily-brief`, `platform-rules`.

## Schedules (UTC on Vercel)

| Schedule         | Cron           | Does                                                               |
| ---------------- | -------------- | ------------------------------------------------------------------ |
| `daily-brief`    | `0 16 * * *`   | 06:00 HST growth brief, saved to `growth_briefs`; queues ≤2 posts  |
| `weekly-revenue` | `0 17 * * 1`   | Monday revenue brief                                               |
| `watchdog`       | `30 */6 * * *` | Retries transient job failures, flags expired tokens               |

A scheduled run has no person attached, so every gated tool is denied there by policy (see
`agent/lib/approval.ts`). Schedules queue and report; you approve.

## Approval model

`agent/lib/approval.ts` is the one place the rule lives:

- Human caller + write → pause for approval (rendered as buttons in `/admin/agent`).
- App principal (a schedule) + write → denied with a reason the model reads.
- Read tool names (`list_`, `get_`, `search_`, …) → run.

## Environment

Already required by the site: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `CONTENT_ADMIN_KEY`, `GEMINI_API_KEY`.

New, all optional:

| Variable                   | What                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN`    | Personal access token for the read-only Supabase MCP               |
| `SUPABASE_PROJECT_REF`     | Defaults to the linked project                                     |
| `POSTHOG_PERSONAL_API_KEY` | `phx_…` key for the PostHog MCP                                    |
| `POSTHOG_MCP_URL`          | Override for EU cloud                                              |
| `FIRECRAWL_API_KEY`        | Firecrawl MCP                                                      |

Models call Anthropic directly with `ANTHROPIC_API_KEY` (Opus 5.5 for the operator, Sonnet
5.5 for the subagents). The team's AI Gateway is on the free tier, which refuses Opus; once it
has credits, a `"anthropic/<id>"` string in `agent/agent.ts` routes through the gateway
instead and picks up its fallbacks and spend reports. Locally, `vercel env pull .env.local`
brings the key down; sensitive variables such as `CONTENT_ADMIN_KEY` arrive as placeholders.

For API access without the admin key, the channel also accepts the project's Vercel OIDC
token (`VERCEL_OIDC_TOKEN` from `vercel env pull`) as a bearer token.

## Run it

```bash
npm run agent:info     # discovery + compile diagnostics
npm run agent          # eve TUI against the local agent
npm run dev            # next dev + the agent on /eve/v1 (open /admin/agent)
npm run test           # includes agent/lib/*.test.ts
```

Fire a schedule by hand while `eve dev` is running:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily-brief
```

## Deploy

Push to `main` as usual. The Vercel build runs `next build`; `withEve` adds the eve service
and its cron jobs to the Build Output. First deploy after this change: check
**Settings → Cron Jobs** shows the three schedules, then open `/admin/agent` and send
"pipeline status".

Optional next steps, each one command:

- `npx eve add channel/slack` — talk to it from Slack with approvals as buttons.
- `npx eve add memory/file` — durable memory across sessions, stored in Vercel Blob.
- `npx eve eval` — evals live beside `agent/`; add cases for the brief and the approval rule.

## Where to change things

- Voice and pillars: `lib/voice.ts`, `lib/pillars.ts` (compiled into the agent's prompt).
- Standing rules: `agent/instructions.md`.
- Procedures: `agent/skills/*`.
- Model and cost cap: `agent/agent.ts`.
