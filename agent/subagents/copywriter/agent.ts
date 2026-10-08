import { defineAgent } from 'eve';

export default defineAgent({
  description:
    'Writes copy in the Vitae voice from a brief: post briefs for queue_post, hooks, carousel slide text, Short scripts, product descriptions, email lines. Give it the subject, pillar, angle, format and any facts to use; it does not see the conversation.',
  model: 'anthropic/claude-sonnet-5',
  reasoning: 'low',
  defaultTools: false,
  limits: { maxTokenCostUsdPerSession: 0.5 },
});
