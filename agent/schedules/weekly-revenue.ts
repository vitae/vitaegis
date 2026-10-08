import { defineSchedule } from 'eve/schedules';

/** Monday 07:00 Honolulu, an hour after the daily brief. */
export default defineSchedule({
  cron: '0 17 * * 1',
  markdown: `Write the weekly revenue brief. Load the monetization and daily-brief skills.

Use revenue_snapshot for 7 and 30 days, the stripe connection for active subscriptions and
any churn or failed payments in the last week, and growth_briefs for what last week's briefs
proposed. Compare this week to last. Name the one product or offer move for the coming week
and the first step. Save it with save_growth_brief using the headline prefix "Weekly:".

Scheduled run: read only. No Stripe writes, no approvals.`,
});
