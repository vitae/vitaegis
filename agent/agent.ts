import { defineAgent } from 'eve';
import { anthropic } from 'eve/models/anthropic';

/**
 * The Vitaegis operator agent. It calls Anthropic directly with ANTHROPIC_API_KEY (already
 * set on the Vercel project); the team's AI Gateway is on the free tier, which does not
 * serve Opus. To route through the gateway later, replace the model with a
 * "anthropic/<id>" string. Model ids verified against the key on 2026-10-08.
 */
export default defineAgent({
  model: anthropic('claude-opus-5-5'),
  reasoning: 'medium',
  compaction: { thresholdPercent: 0.8 },
  limits: {
    // A runaway loop should cost dollars, not hundreds. Approve to continue when it trips.
    maxTokenCostUsdPerSession: 5,
    sessionTimeoutMs: 14 * 24 * 60 * 60 * 1000,
  },
  build: {
    // Native binaries the content pipeline shells out to stay external; the agent never
    // bundles them, it only reads the tables the pipeline writes.
    externalDependencies: ['ffmpeg-static', '@resvg/resvg-js'],
  },
});
