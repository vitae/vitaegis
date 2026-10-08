import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';

/**
 * Media routing is decided by keywords in the note (see docs/content-pipeline.md). The
 * agent picks a kind explicitly and the matching keyword is appended so the caption stage
 * routes it without guessing.
 */
const KEYWORD: Record<string, string> = {
  slides: 'slides',
  video: 'veo',
  image: 'illustrate',
};

export default defineTool({
  description:
    'Queue a new post in the content pipeline. Gemini writes per-platform captions from the note, media is generated according to mediaKind, and the post lands in /admin/content as "ready" for the operator to approve. Nothing is published by this tool. Slides are cheap; video (Veo) is the expensive path.',
  inputSchema: z.object({
    note: z
      .string()
      .min(10)
      .describe(
        'The brief for this post: the subject, the angle, the takeaway, and any lines that must appear. Write it in the brand voice.',
      ),
    mediaKind: z
      .enum(['slides', 'video', 'image'])
      .default('slides')
      .describe('slides = four-slide carousel, video = Veo clip, image = one still.'),
    pillar: z.enum(['health', 'stealth', 'wealth']).optional(),
    topic: z.string().optional().describe('A stable topic key, e.g. "H-01:morning-light".'),
  }),
  label: { start: ({ mediaKind }) => `Queue a ${mediaKind} post` },
  async execute({ note, mediaKind, pillar, topic }) {
    const keyword = KEYWORD[mediaKind];
    const fullNote = note.toLowerCase().includes(keyword) ? note : `${note}\n\n(${keyword})`;
    const now = new Date().toISOString();

    const { data: ingest, error } = await db()
      .from('content_ingest')
      .insert({
        kind: 'text',
        origin: 'agent',
        note: fullNote,
        status: 'queued',
        meta: { topic: topic ?? null, pillar: pillar ?? null, mediaKind },
      })
      .select('id')
      .single();
    if (error || !ingest) throw new Error(error?.message ?? 'Could not create ingest');

    const { error: jErr } = await db()
      .from('content_jobs')
      .insert({ kind: 'caption', ingest_id: ingest.id, run_after: now });
    if (jErr) throw new Error(jErr.message);

    return {
      ingestId: ingest.id,
      mediaKind,
      next: 'The worker cron picks this up within two minutes. Slides take a few minutes; a Veo clip can take ten or more. It will appear under list_posts status "ready".',
    };
  },
});
