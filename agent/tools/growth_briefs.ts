import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db, clip } from '../lib/db';

export default defineTool({
  description:
    "Read past growth briefs (newest first) so today's brief builds on yesterday's and never pitches the same idea twice.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(30).optional().describe('Default 7.'),
  }),
  label: { start: () => 'Read growth briefs' },
  async execute({ limit = 7 }) {
    const { data, error } = await db()
      .from('growth_briefs')
      .select('id, run_date, headline, ideas, brief, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return {
      briefs: (data ?? []).map((b) => ({ ...b, brief: clip(b.brief, 1200) })),
    };
  },
});
