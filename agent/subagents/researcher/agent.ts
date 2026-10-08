import { defineAgent } from 'eve';
import { anthropic } from 'eve/models/anthropic';

export default defineAgent({
  description:
    'Researches a question on the web and returns sourced findings: trends, competitor moves, what a study actually says, platform policy changes, pricing of comparable products. Give it the exact question and what the answer is for; it does not see the conversation.',
  model: anthropic('claude-sonnet-5-5'),
  reasoning: 'medium',
  limits: { maxTokenCostUsdPerSession: 1 },
});
