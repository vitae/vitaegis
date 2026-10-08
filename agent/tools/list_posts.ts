import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { listPosts } from '../lib/pipeline';

export default defineTool({
  description:
    'List content posts with their status, caption, platforms, publish links and source note. Use status "ready" for posts waiting on the operator, "needs" for anything needing attention (ready, draft, failed), "published" for what went out.',
  inputSchema: z.object({
    status: z
      .enum(['needs', 'draft', 'ready', 'approved', 'publishing', 'published', 'rejected', 'failed'])
      .optional(),
    limit: z.number().int().min(1).max(50).optional().describe('Default 20.'),
    q: z.string().optional().describe('Case-insensitive search over the default caption.'),
  }),
  label: { start: ({ status }) => `List ${status ?? 'all'} posts` },
  async execute(input) {
    const posts = await listPosts(input);
    return { count: posts.length, posts };
  },
});
