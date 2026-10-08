import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db, clip } from '../lib/db';
import { TOPICS } from '../../lib/research';

export default defineTool({
  description:
    'Read the research desk: sources that have been ingested, the findings and quotes pulled from them, and the collated topic briefs. Use it to decide what to post about and to cite evidence.',
  inputSchema: z.object({
    view: z.enum(['sources', 'findings', 'briefs']).default('briefs'),
    topic: z.enum(TOPICS).optional(),
    limit: z.number().int().min(1).max(50).optional().describe('Default 20.'),
  }),
  label: { start: ({ view, topic }) => `Read research ${view}${topic ? ` on ${topic}` : ''}` },
  async execute({ view, topic, limit = 20 }) {
    if (view === 'sources') {
      let q = db()
        .from('research_sources')
        .select('id, kind, title, author, url, topics, status, summary, findings_count, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (topic) q = q.contains('topics', [topic]);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { sources: (data ?? []).map((s) => ({ ...s, summary: clip(s.summary, 300) })) };
    }
    if (view === 'findings') {
      let q = db()
        .from('research_findings')
        .select('id, source_id, kind, text, evidence, location, topic, strength')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (topic) q = q.eq('topic', topic);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return {
        findings: (data ?? []).map((f) => ({ ...f, text: clip(f.text, 400), evidence: clip(f.evidence, 300) })),
      };
    }
    let q = db()
      .from('research_briefs')
      .select('id, topic, title, hook, summary, key_findings, takeaway, status, ingest_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (topic) q = q.eq('topic', topic);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { briefs: (data ?? []).map((b) => ({ ...b, summary: clip(b.summary, 500) })) };
  },
});
