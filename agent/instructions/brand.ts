import { defineInstructions } from 'eve/instructions';
import { VITAE_VOICE } from '../../lib/voice';
import { pillars } from '../../lib/pillars';

/**
 * Brand context compiled in at build time from the same files the site renders from, so
 * curating the voice or the pillars on the site also curates the agent.
 */
function pillarSummary() {
  return pillars
    .map((p) => {
      const topics = p.topics.map((t) => `${t.code} ${t.label}`).join(', ');
      const dossiers = p.dossiers.map((d) => `${d.code} ${d.title}`).join('; ');
      return [
        `### ${p.numeral}. ${p.name} (${p.codename})`,
        p.doctrine,
        p.summary,
        `Headline topics: ${topics}.`,
        `Dossiers: ${dossiers}.`,
        `Directives: ${p.directives.join(' ')}`,
      ].join('\n');
    })
    .join('\n\n');
}

export default defineInstructions({
  content: `## The brand

${VITAE_VOICE}

## The three pillars

Every post, brief and product maps to one pillar. Rotate them; never post the same pillar twice
in a row when you have a choice.

${pillarSummary()}`,
});
