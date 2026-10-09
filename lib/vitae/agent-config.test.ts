import { describe, expect, it } from 'vitest';
import { VITAE_AGENT_NAME, VITAE_LLM, VITAE_MAX_SECONDS, buildAgentConfig } from './agent-config';
import { VITAE_FIRST_MESSAGE } from './persona';

describe('agent config', () => {
  const cfg = buildAgentConfig({
    voiceId: 'voice_1',
    toolIds: ['tool_a', 'tool_b'],
    knowledge: [{ id: 'kb_1', name: 'vitae:store' }],
  });

  it('names the agent, model, voice and cap', () => {
    expect(VITAE_AGENT_NAME).toBe('Vitae');
    expect(VITAE_LLM).toBe('claude-sonnet-4-5');
    expect(VITAE_MAX_SECONDS).toBe(600);
    expect(cfg.name).toBe('Vitae');
    expect(cfg.conversation_config.tts.voice_id).toBe('voice_1');
    expect(cfg.conversation_config.conversation.max_duration_seconds).toBe(600);
    expect(cfg.conversation_config.agent.prompt.llm).toBe('claude-sonnet-4-5');
  });

  it('attaches tools by id and knowledge as text locators', () => {
    expect(cfg.conversation_config.agent.prompt.tool_ids).toEqual(['tool_a', 'tool_b']);
    expect(cfg.conversation_config.agent.prompt.knowledge_base).toEqual([
      { type: 'text', id: 'kb_1', name: 'vitae:store', usage_mode: 'auto' },
    ]);
  });

  it('uses the persona prompt and first message', () => {
    expect(cfg.conversation_config.agent.first_message).toBe(VITAE_FIRST_MESSAGE);
    expect(cfg.conversation_config.agent.prompt.prompt).toMatch(/You are Vitae/);
    expect(cfg.conversation_config.agent.language).toBe('en');
  });
});
