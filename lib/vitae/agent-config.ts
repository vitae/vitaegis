import { VITAE_FIRST_MESSAGE, buildPersonaPrompt } from './persona';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · agent payload
   The body sent to POST /v1/convai/agents/create and PATCH /v1/convai/agents/{id}.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const VITAE_AGENT_NAME = 'Vitae';
export const VITAE_LLM = 'claude-sonnet-4-5';
export const VITAE_MAX_SECONDS = 600;

export interface KnowledgeLocator {
  type: 'text';
  id: string;
  name: string;
  usage_mode: 'auto';
}

export interface AgentPayload {
  name: string;
  conversation_config: {
    agent: {
      first_message: string;
      language: 'en';
      prompt: {
        prompt: string;
        llm: string;
        tool_ids: string[];
        knowledge_base: KnowledgeLocator[];
      };
    };
    tts: { voice_id: string };
    conversation: { max_duration_seconds: number };
  };
}

export function buildAgentConfig(input: {
  voiceId: string;
  toolIds: string[];
  knowledge: { id: string; name: string }[];
}): AgentPayload {
  return {
    name: VITAE_AGENT_NAME,
    conversation_config: {
      agent: {
        first_message: VITAE_FIRST_MESSAGE,
        language: 'en',
        prompt: {
          prompt: buildPersonaPrompt(),
          llm: VITAE_LLM,
          tool_ids: input.toolIds,
          knowledge_base: input.knowledge.map((k) => ({
            type: 'text',
            id: k.id,
            name: k.name,
            usage_mode: 'auto',
          })),
        },
      },
      tts: { voice_id: input.voiceId },
      conversation: { max_duration_seconds: VITAE_MAX_SECONDS },
    },
  };
}
