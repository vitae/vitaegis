import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';
import { gated } from '../lib/approval';
import { PLATFORMS } from '../../lib/social';

export default defineTool({
  description:
    'Approve a "ready" post and queue it to publish on its platforms. This is the publish button: it always pauses for the operator. Optionally override the platform list or a caption before it goes out.',
  inputSchema: z.object({
    postId: z.string().uuid(),
    platforms: z
      .array(z.enum(['instagram', 'facebook', 'youtube', 'tiktok', 'twitter']))
      .min(1)
      .optional(),
    captions: z
      .record(z.string())
      .optional()
      .describe('Partial caption overrides keyed by platform or "default".'),
  }),
  approval: gated,
  label: { start: ({ postId }) => `Publish post ${postId.slice(0, 8)}` },
  async execute({ postId, platforms, captions }) {
    const now = new Date().toISOString();
    const { data: post, error } = await db()
      .from('content_posts')
      .select('id, status, captions, platforms')
      .eq('id', postId)
      .single();
    if (error || !post) throw new Error('Post not found');
    if (post.status !== 'ready') {
      throw new Error(`Post is "${post.status}", only "ready" posts can be approved.`);
    }

    const patch: Record<string, unknown> = { status: 'approved', approved_at: now, updated_at: now };
    if (platforms) patch.platforms = platforms.filter((p) => (PLATFORMS as string[]).includes(p));
    if (captions) patch.captions = { ...(post.captions as Record<string, string>), ...captions };

    // Claim it atomically so a replayed step or a concurrent click cannot double-publish.
    const { data: claimed } = await db()
      .from('content_posts')
      .update(patch)
      .eq('id', postId)
      .eq('status', 'ready')
      .select('id')
      .single();
    if (!claimed) return { queued: false, reason: 'Someone else acted on this post first.' };

    const { error: jErr } = await db()
      .from('content_jobs')
      .insert({ kind: 'publish', post_id: postId, run_after: now });
    if (jErr) throw new Error(jErr.message);
    return { queued: true, postId, platforms: patch.platforms ?? post.platforms };
  },
});
