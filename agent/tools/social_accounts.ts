import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { listAccounts, PLATFORMS } from '../../lib/social';

export default defineTool({
  description:
    'Which social accounts are connected for publishing, with the account name and whether the token has expired. Reconnect links live at /api/social/connect/<platform>.',
  inputSchema: z.object({}),
  label: { start: () => 'Check social accounts' },
  async execute() {
    const accounts = await listAccounts();
    const now = Math.floor(Date.now() / 1000);
    return PLATFORMS.map((p) => {
      const a = accounts.find((x) => x.platform === p);
      return {
        platform: p,
        connected: Boolean(a),
        name: a?.account_name ?? null,
        expiresAt: a?.expires_at ? new Date(a.expires_at * 1000).toISOString() : null,
        expired: a?.expires_at != null && a.expires_at < now,
        reconnect: `/api/social/connect/${p === 'instagram' ? 'facebook' : p}`,
      };
    });
  },
});
