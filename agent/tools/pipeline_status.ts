import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { counts, failedJobs } from '../lib/pipeline';
import { listAccounts, PLATFORMS } from '../../lib/social';
import { autopilotConfig } from '../../lib/autopilot';

export default defineTool({
  description:
    'Health of the content pipeline: posts waiting for review, drafts in flight, failed jobs, connected social accounts, autopilot settings, and which services are configured. Call this first for any planning or status question.',
  inputSchema: z.object({}),
  label: { start: () => 'Check pipeline status' },
  async execute() {
    const [tallies, failed, accounts] = await Promise.all([
      counts(),
      failedJobs(10),
      listAccounts().catch(() => []),
    ]);
    const connected = new Set(accounts.map((a) => a.platform));
    const now = Math.floor(Date.now() / 1000);
    return {
      ...tallies,
      failedJobs: failed,
      accounts: PLATFORMS.map((p) => {
        const a = accounts.find((x) => x.platform === p);
        return {
          platform: p,
          connected: connected.has(p),
          name: a?.account_name ?? null,
          tokenExpired: a?.expires_at != null && a.expires_at < now,
        };
      }),
      autopilot: autopilotConfig(),
      services: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        typesafe: Boolean(process.env.TYPESAFE_API_KEY),
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        drive: Boolean(process.env.GDRIVE_FOLDER_ID),
        cron: Boolean(process.env.CRON_SECRET),
        posthog: Boolean(process.env.POSTHOG_PERSONAL_API_KEY),
        firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
        supabaseMcp: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
      },
      generatedAt: new Date().toISOString(),
    };
  },
});
