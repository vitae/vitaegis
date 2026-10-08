import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { db } from '../lib/db';

const Idea = z.object({
  title: z.string(),
  channel: z.string().describe('instagram, youtube, tiktok, x, email, product, site...'),
  why: z.string(),
  first_step: z.string(),
  effort: z.enum(['hours', 'days', 'weeks']),
  revenue_path: z.string().describe('How this turns into money, in one line.'),
});

export default defineTool({
  description:
    'Save the daily growth brief: a headline, the ranked ideas, and the full markdown report. One per run; it shows up in the admin dashboard and feeds tomorrow\'s brief.',
  inputSchema: z.object({
    headline: z.string().min(5).max(200),
    ideas: z.array(Idea).min(1).max(8),
    brief: z.string().min(50).describe('The full report in markdown.'),
  }),
  label: { start: ({ headline }) => `Save brief: ${headline}` },
  async execute({ headline, ideas, brief }) {
    const { data, error } = await db()
      .from('growth_briefs')
      .insert({ headline, ideas, brief })
      .select('id, run_date')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Insert failed');
    return { saved: true, ...data };
  },
});
