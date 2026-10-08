import { defineSchedule } from 'eve/schedules';

/** 06:00 Honolulu is 16:00 UTC. Vercel evaluates cron in UTC. */
export default defineSchedule({
  cron: '0 16 * * *',
  markdown: `Load the daily-brief skill and write this morning's growth brief.

Gather with the tools, write the brief, save it with save_growth_brief, retry any transient
job failures, and queue at most two posts if fewer than five are already ready. This is a
scheduled run with no operator present: do not call approve_post or any Stripe write; leave
those decisions in the "Needs you" section of the brief.`,
});
