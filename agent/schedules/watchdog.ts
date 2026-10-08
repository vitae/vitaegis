import { defineSchedule } from 'eve/schedules';

/** Every six hours: keep the pipeline moving without a person. */
export default defineSchedule({
  cron: '30 */6 * * *',
  markdown: `Pipeline watchdog. Call pipeline_status.

For each failed job: if the error looks transient (timeout, 429, 5xx, "fetch failed",
"rate limit", "overloaded", a Veo operation that expired), requeue it with retry_job. If it
looks like configuration (missing key, 401, 403, "not configured", quota exhausted for the
day, an unverified domain), do not retry; note it.

Also flag any social account whose token has expired.

If every job is healthy and nothing needs the operator, call no_reply. Otherwise reply with a
short list: what you retried, and what needs a person. Do not queue or approve posts.`,
});
