import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';

export default defineTool({
  description:
    'Requeue a failed pipeline job (caption, slides, video, publish, research...). Safe for transient errors such as timeouts, 429s or 5xx from a provider. Do not retry a job whose error is a configuration or policy problem; report it instead.',
  inputSchema: z.object({ jobId: z.string().uuid() }),
  label: { start: ({ jobId }) => `Retry job ${jobId.slice(0, 8)}` },
  async execute({ jobId }) {
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from('content_jobs')
      .update({ state: 'queued', attempts: 0, error: null, run_after: now, updated_at: now })
      .eq('id', jobId)
      .eq('state', 'failed')
      .select('id, kind, post_id')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { requeued: false, reason: 'Job is not in the failed state.' };
    // A failed publish leaves the post failed too; put it back so the worker will touch it.
    if (data.kind === 'publish' && data.post_id) {
      await db()
        .from('content_posts')
        .update({ status: 'approved', error: null, updated_at: now })
        .eq('id', data.post_id)
        .eq('status', 'failed');
    }
    return { requeued: true, job: data };
  },
});
