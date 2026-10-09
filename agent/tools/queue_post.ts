import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';
import { findTenet, TENET_ID } from '../../lib/tenets';

/**
 * Media routing is decided by keywords in the note (see docs/content-pipeline.md). For the
 * generated kinds the agent picks one explicitly and the matching keyword is appended so
 * the caption stage routes it without guessing.
 */
const KEYWORD: Record<string, string> = {
  slides: 'slides',
  video: 'veo',
  image: 'illustrate',
};

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter'] as const;

const Card = z.object({
  id: z
    .string()
    .regex(
      TENET_ID,
      'Tenet IDs look like H-01.02, S-00.03 or W-P.01; find them with the tenets tool.',
    )
    .optional()
    .describe(
      'The registry ID of the tenet this card teaches (from the tenets tool). Required on every card except a pure hook or closing card.',
    ),
  code: z.string().max(12).optional().describe('Dossier code for the kicker, e.g. "H-01".'),
  pillar: z.enum(['Health', 'Stealth', 'Wealth']).optional(),
  title: z.string().min(3).max(90).describe('The headline. Short; two lines at most.'),
  lines: z
    .array(z.string().min(3).max(140))
    .min(1)
    .max(4)
    .describe('One point per line, written out as it should appear on the card.'),
  footer: z.string().max(40).optional().describe('Defaults to vitaegis.com.'),
});

const Captions = z.object({
  default: z.string().min(10),
  instagram: z.string().min(10).optional(),
  facebook: z.string().min(10).optional(),
  youtube: z.string().min(5).optional().describe('First line is the Short title.'),
  tiktok: z.string().min(5).optional(),
  twitter: z.string().min(5).max(280).optional(),
});

export default defineTool({
  description: `Queue a new post in the content pipeline. The post lands in /admin/content as "ready" for the operator to approve; nothing is published by this tool.

Two paths:
- cards / reel: you supply the slide text and the captions. The cards are drawn in the brand style on the server (no model, no cost, no AI label). "cards" makes a feed carousel for Instagram, Facebook and X; "reel" cuts the same cards into a vertical video for Instagram Reels, Facebook, YouTube Shorts and TikTok. Use these for concept posts from the pillars, dossiers, proverbs and research, and whenever Gemini media is unavailable.
- slides / video / image: Gemini writes captions from the note and generates the media (Nano Banana Pro or Veo). Needs Google billing; video is the expensive path.`,
  inputSchema: z.object({
    note: z
      .string()
      .min(10)
      .describe(
        'The brief: subject, angle, takeaway. For cards/reel it is kept as the source note; for the Gemini kinds it is what the captions are written from.',
      ),
    mediaKind: z.enum(['cards', 'reel', 'slides', 'video', 'image']).default('cards'),
    slides: z
      .array(Card)
      .min(1)
      .max(10)
      .optional()
      .describe('Required for cards and reel. 3 to 5 cards: hook, points, takeaway.'),
    captions: Captions.optional().describe(
      'Required for cards and reel. Per-platform captions in the brand voice; default is used where a platform is missing.',
    ),
    platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
    secondsPerCard: z.number().min(2).max(8).optional().describe('Reel only. Default 4.'),
    tip: z
      .boolean()
      .optional()
      .describe(
        'Put the Bitcoin Lightning tip QR and address on the last card (needs NEXT_PUBLIC_LIGHTNING_ADDRESS). Default false.',
      ),
    pillar: z.enum(['health', 'stealth', 'wealth']).optional(),
    topic: z.string().optional().describe('A stable topic key, e.g. "H-01:morning-light".'),
  }),
  label: { start: ({ mediaKind }) => `Queue a ${mediaKind} post` },
  async execute({
    note,
    mediaKind,
    slides,
    captions,
    platforms,
    secondsPerCard,
    tip,
    pillar,
    topic,
  }) {
    const now = new Date().toISOString();

    if (mediaKind === 'cards' || mediaKind === 'reel') {
      if (!slides?.length) throw new Error('cards and reel need `slides`.');
      if (!captions) throw new Error('cards and reel need `captions`.');
      const reel = mediaKind === 'reel';
      const tenetIds = [
        ...new Set(slides.map((s) => s.id).filter((id): id is string => Boolean(id))),
      ];
      const unknown = tenetIds.filter((id) => !findTenet(id));
      if (unknown.length) {
        throw new Error(
          `Unknown tenet id(s): ${unknown.join(', ')}. Look them up with the tenets tool.`,
        );
      }
      if (!tenetIds.length) {
        throw new Error('At least one card must carry a tenet id so the post can be traced.');
      }
      const targets =
        platforms ??
        (reel
          ? ['instagram', 'facebook', 'youtube', 'tiktok']
          : ['instagram', 'facebook', 'twitter']);

      const { data: ingest, error } = await db()
        .from('content_ingest')
        .insert({
          kind: 'text',
          origin: 'agent',
          note,
          status: 'done',
          meta: { topic: topic ?? null, pillar: pillar ?? null, mediaKind, tenets: tenetIds },
        })
        .select('id')
        .single();
      if (error || !ingest) throw new Error(error?.message ?? 'Could not create ingest');

      const { data: post, error: pErr } = await db()
        .from('content_posts')
        .insert({
          ingest_id: ingest.id,
          status: 'draft',
          media_kind: reel ? 'video' : slides.length > 1 ? 'slides' : 'image',
          platforms: targets,
          // The cards are drawn, not generated, so no AI label is owed.
          ai_disclosure: false,
          captions: {
            default: captions.default,
            instagram: captions.instagram ?? captions.default,
            facebook: captions.facebook ?? captions.default,
            youtube: captions.youtube ?? captions.default,
            tiktok: captions.tiktok ?? captions.default,
            twitter: captions.twitter ?? captions.default.slice(0, 280),
          },
        })
        .select('id')
        .single();
      if (pErr || !post) throw new Error(pErr?.message ?? 'Could not create post');

      const { error: jErr } = await db()
        .from('content_jobs')
        .insert({
          kind: 'cards',
          post_id: post.id,
          ingest_id: ingest.id,
          payload: {
            slides:
              tip && process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS
                ? slides.map((s, i) =>
                    i === slides.length - 1
                      ? { ...s, lightning: process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS }
                      : s,
                  )
                : slides,
            reel,
            seconds: secondsPerCard ?? 4,
          },
          run_after: now,
        });
      if (jErr) throw new Error(jErr.message);

      return {
        postId: post.id,
        ingestId: ingest.id,
        mediaKind,
        platforms: targets,
        tenets: tenetIds,
        next: `The worker renders the ${reel ? 'reel' : 'cards'} within a couple of minutes; it then shows under list_posts as "ready" for the operator to approve.`,
      };
    }

    const keyword = KEYWORD[mediaKind];
    const fullNote = note.toLowerCase().includes(keyword) ? note : `${note}\n\n(${keyword})`;
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
      next: 'The worker cron picks this up within two minutes. Slides take a few minutes; a Veo clip can take ten or more. It will appear under list_posts as "ready".',
    };
  },
});
