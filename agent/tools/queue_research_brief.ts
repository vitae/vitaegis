import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';
import { TOPICS } from '../../lib/research';

export default defineTool({
  description:
    'Collate the research findings on a topic into a new brief (hook, key findings, quotes, takeaway). The research worker builds it; read it back with the research tool once its status is "ready". A ready brief can be turned into a carousel from /admin/research.',
  inputSchema: z.object({
    topic: z.enum(TOPICS),
    sourceIds: z.array(z.string().uuid()).optional().describe('Limit to these sources.'),
  }),
  label: { start: ({ topic }) => `Build a ${topic} brief` },
  async execute({ topic, sourceIds }) {
    const { data, error } = await db()
      .from('research_briefs')
      .insert({ topic, source_ids: sourceIds ?? [], status: 'queued' })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Insert failed');
    const { error: jErr } = await db()
      .from('content_jobs')
      .insert({
        kind: 'research_brief',
        payload: { briefId: data.id },
        run_after: new Date().toISOString(),
      });
    if (jErr) throw new Error(jErr.message);
    return { briefId: data.id, topic };
  },
});
