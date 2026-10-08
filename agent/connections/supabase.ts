import { defineDynamic, defineMcpClientConnection } from 'eve/connections';
import { gateWrites } from '../lib/approval';

/**
 * Supabase's hosted MCP server in read-only mode, so ad-hoc SQL over the pipeline, research
 * and KeyCrate tables is available without any way to mutate them. Needs a personal access
 * token in SUPABASE_ACCESS_TOKEN; absent that, the connection is simply not offered.
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'fsrxacvcqftelbjdqlnm';

export default defineDynamic({
  events: {
    'session.started': () => {
      const token = process.env.SUPABASE_ACCESS_TOKEN;
      if (!token) return null;
      const url = new URL('https://mcp.supabase.com/mcp');
      url.searchParams.set('project_ref', PROJECT_REF);
      url.searchParams.set('read_only', 'true');
      url.searchParams.set('features', 'database,docs,debugging');
      return defineMcpClientConnection({
        url: url.toString(),
        description:
          'Supabase project database, read-only: run SQL over content_posts, content_jobs, research_*, growth_briefs, kc_* tables; read logs and advisors; search Supabase docs.',
        auth: { credentialOwner: 'app', getToken: async () => ({ token }) },
        approval: gateWrites(['execute_sql', 'list_tables', 'list_extensions', 'list_migrations']),
      });
    },
  },
});
