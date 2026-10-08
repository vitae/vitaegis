---
description: Use for the morning growth brief, the weekly revenue brief, or any "what should we do today" request.
---

# The daily growth brief

Written every morning (06:00 Honolulu) by the schedule, or on demand. It is the operator's
first read of the day, so it must be short, concrete and honest.

## Gather

1. `pipeline_status`
2. `list_posts` status `published`, limit 10, and status `needs`, limit 10
3. `revenue_snapshot` with 7 days, and 30 days if it is Monday
4. `growth_briefs` limit 3, so you never repeat yesterday's ideas
5. `research` view `briefs`, limit 5
6. If PostHog is connected: yesterday's pageviews and top pages via the connection.

## Write

Headline: one line, the single most important thing (a win, a problem, or the one move).

Sections, each a few bullets at most:

- **Shipped**: what published yesterday, with links. Skip if nothing.
- **Numbers**: revenue this week, subscriptions, anything that moved. Numbers from tools only.
- **Needs you**: posts waiting for approval, failed jobs you could not retry, expired tokens.
- **Today**: what you queued or will queue, which pillar, which format, and why.
- **One idea**: a single revenue-bearing idea with a first step that fits in an hour.

## Save and queue

- Save it with `save_growth_brief`. `ideas` carries the one idea plus any extras you did not
  act on, each with a `revenue_path`.
- Queue at most two posts with `queue_post`, and only if fewer than five are already `ready`.
- Retry transient failures with `retry_job`. Do not retry configuration errors.
- Never approve a post from the brief. The operator does that.

## Tone

Calm, precise. No cheerleading. If a number is bad, say it and say the next move.
