import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { searchTenets, tenets } from '../../lib/tenets';
import { clip } from '../lib/db';

export default defineTool({
  description:
    'The tenet registry: every prescribed line of wisdom on vitaegis.com with its stable ID (H-01.02 = second entry of dossier H-01; H-00.03 = third Health directive; W-P.01 = first step of the Wealth protocol). Search by text, pillar or dossier. Every concept card must carry one of these IDs so the tenet can be traced from the post back to the site.',
  inputSchema: z.object({
    q: z.string().optional().describe('Case-insensitive search over id, title, text, dossier.'),
    pillar: z.enum(['health', 'stealth', 'wealth']).optional(),
    dossierCode: z
      .string()
      .optional()
      .describe('e.g. "H-01", "S-00" (directives), "W-P" (protocol).'),
    limit: z.number().int().min(1).max(100).optional().describe('Default 30.'),
  }),
  label: {
    start: ({ q, pillar, dossierCode }) =>
      `Tenets ${[pillar, dossierCode, q].filter(Boolean).join(' ')}`,
  },
  async execute({ q, pillar, dossierCode, limit = 30 }) {
    const hits = searchTenets({ q, pillar, dossierCode, limit });
    return {
      total: tenets().length,
      count: hits.length,
      tenets: hits.map((t) => ({
        id: t.id,
        pillar: t.pillar,
        dossier: `${t.dossierCode} ${t.dossierTitle}`,
        title: t.title,
        text: clip(t.text, 400),
        href: `https://www.vitaegis.com${t.href}`,
      })),
    };
  },
});
