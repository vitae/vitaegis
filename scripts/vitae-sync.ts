// Push Vitae's prompt, tools and knowledge to ElevenLabs. Creates the agent the first
// time (prints ELEVENLABS_AGENT_ID to set), patches it after that.
//   npm run vitae:sync
import { config as loadEnv } from 'dotenv';
import { ElevenLabs } from '../lib/vitae/elevenlabs';
import { VITAE_TOOLS } from '../lib/vitae/tools';
import { KNOWLEDGE_PREFIX, buildKnowledge } from '../lib/vitae/knowledge';
import { buildAgentConfig } from '../lib/vitae/agent-config';
import { planKnowledgeSync, planToolSync } from '../lib/vitae/sync-plan';

loadEnv({ path: '.env.local' });

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID is not set. Run npm run vitae:voice first.');
  const el = new ElevenLabs(apiKey);

  // Tools
  const toolPlan = planToolSync(await el.listTools(), VITAE_TOOLS);
  const toolIds: string[] = [];
  for (const { id, def } of toolPlan.update) {
    await el.updateTool(id, def);
    toolIds.push(id);
  }
  for (const def of toolPlan.create) toolIds.push(await el.createTool(def));

  // Knowledge
  const kbPlan = planKnowledgeSync(await el.listKnowledge(KNOWLEDGE_PREFIX), buildKnowledge());
  const knowledge: { id: string; name: string }[] = [];
  for (const doc of kbPlan.create) {
    knowledge.push({ id: await el.createKnowledgeText(doc), name: doc.name });
  }

  // Agent
  const payload = buildAgentConfig({ voiceId, toolIds, knowledge });
  let id = agentId;
  if (id) await el.updateAgent(id, payload);
  else id = await el.createAgent(payload);

  // Old knowledge goes only after the agent points at the new documents.
  for (const oldId of kbPlan.deleteIds) await el.deleteKnowledge(oldId);

  console.log(`Vitae synced.
  agent:     ${id}${agentId ? '' : '   ← set ELEVENLABS_AGENT_ID to this in Vercel and .env.local'}
  voice:     ${voiceId}
  tools:     ${toolIds.length} (${toolPlan.create.length} created, ${toolPlan.update.length} updated)
  knowledge: ${knowledge.length} documents (${kbPlan.deleteIds.length} replaced)`);
}

main().catch((err) => {
  console.error('[vitae:sync] failed:', err?.message ?? err);
  process.exit(1);
});
