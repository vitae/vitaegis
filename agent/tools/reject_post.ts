import { defineTool } from 'eve/tools';
import { once } from 'eve/tools/approval';
import { z } from 'zod';
import { db } from '../lib/db';

export default defineTool({
  description:
    'Reject a post so it never publishes. Reversible from /admin/content. Give a reason; it is stored on the post.',
  inputSchema: z.object({ postId: z.string().uuid(), reason: z.string().min(3) }),
  approval: once(),
  label: { start: ({ postId }) => `Reject post ${postId.slice(0, 8)}` },
  async execute({ postId, reason }) {
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from('content_posts')
      .update({ status: 'rejected', error: `Rejected by agent: ${reason}`.slice(0, 1000), updated_at: now })
      .eq('id', postId)
      .in('status', ['ready', 'draft', 'failed'])
      .select('id')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { rejected: Boolean(data), postId };
  },
});
