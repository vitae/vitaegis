import { defineAgent } from 'eve';

/**
 * The Vitaegis operator agent. Model ids route through the Vercel AI Gateway, so the
 * deployment authenticates with project OIDC and needs no provider key of its own.
 * Change the model here or with `eve set model <id>`.
 */
export default defineAgent({
  model: 'anthropic/claude-opus-5.5',
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
