import { defineDynamic, defineMcpClientConnection } from 'eve/connections';
import { gateWrites } from '../lib/approval';

/**
 * PostHog's hosted MCP server: product analytics, web analytics, feature flags, experiments,
 * error tracking and LLM analytics. Offered only when POSTHOG_PERSONAL_API_KEY is set.
 */
export default defineDynamic({
  events: {
    'session.started': () => {
      const token = process.env.POSTHOG_PERSONAL_API_KEY;
      if (!token) return null;
      return defineMcpClientConnection({
        url: process.env.POSTHOG_MCP_URL || 'https://mcp.posthog.com/mcp',
        description:
          'PostHog analytics for vitaegis.com: traffic, funnels, retention, session replays, feature flags, experiments and error tracking. Use it to measure what a post or a page actually did.',
        auth: { credentialOwner: 'app', getToken: async () => ({ token }) },
        approval: gateWrites(['query', 'insights-get-all', 'insight-get', 'dashboards-get-all']),
      });
    },
  },
});
