import type { AgentPayload } from './agent-config';
import type { KnowledgeDoc } from './knowledge';
import type { VitaeToolDef } from './tools';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · ElevenLabs REST client
   The handful of calls the sync scripts and the token route make. No SDK: plain
   fetch, the key in the xi-api-key header, errors carry status and body.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const BASE_URL = 'https://api.elevenlabs.io';

export class ElevenLabsError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string,
  ) {
    super(message ?? `ElevenLabs ${status}: ${body.slice(0, 200)}`);
  }
}

export class ElevenLabs {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'xi-api-key': this.apiKey,
      ...(init.headers as Record<string, string>),
    };
    if (init.body && typeof init.body === 'string') headers['content-type'] = 'application/json';
    const res = await this.fetchImpl(`${BASE_URL}${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) throw new ElevenLabsError(res.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }

  conversationToken(agentId: string): Promise<string> {
    return this.call<{ token: string }>(
      `/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    ).then((r) => r.token);
  }

  async listTools(): Promise<{ id: string; name: string }[]> {
    const r = await this.call<{ tools: { id: string; tool_config: { name: string } }[] }>(
      '/v1/convai/tools',
    );
    return r.tools.map((t) => ({ id: t.id, name: t.tool_config.name }));
  }

  createTool(def: VitaeToolDef): Promise<string> {
    return this.call<{ id: string }>('/v1/convai/tools', {
      method: 'POST',
      body: JSON.stringify({ tool_config: { type: 'client', ...def } }),
    }).then((r) => r.id);
  }

  async updateTool(id: string, def: VitaeToolDef): Promise<void> {
    await this.call(`/v1/convai/tools/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ tool_config: { type: 'client', ...def } }),
    });
  }

  async listKnowledge(prefix: string): Promise<{ id: string; name: string }[]> {
    const r = await this.call<{ documents: { id: string; name: string }[] }>(
      `/v1/convai/knowledge-base?search=${encodeURIComponent(prefix)}&page_size=100&types=text`,
    );
    return r.documents
      .filter((d) => d.name.startsWith(prefix))
      .map((d) => ({ id: d.id, name: d.name }));
  }

  async deleteKnowledge(id: string): Promise<void> {
    await this.call(`/v1/convai/knowledge-base/${encodeURIComponent(id)}?force=true`, {
      method: 'DELETE',
    });
  }

  createKnowledgeText(doc: KnowledgeDoc): Promise<string> {
    return this.call<{ id: string }>('/v1/convai/knowledge-base/text', {
      method: 'POST',
      body: JSON.stringify({ name: doc.name, text: doc.text }),
    }).then((r) => r.id);
  }

  createAgent(payload: AgentPayload): Promise<string> {
    return this.call<{ agent_id: string }>('/v1/convai/agents/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.agent_id);
  }

  async updateAgent(id: string, payload: AgentPayload): Promise<void> {
    await this.call(`/v1/convai/agents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async addVoice(name: string, files: { name: string; blob: Blob }[]): Promise<string> {
    const form = new FormData();
    form.set('name', name);
    form.set('description', 'Vitae, the voice of Vitaegis.');
    for (const f of files) form.append('files', f.blob, f.name);
    const r = await this.call<{ voice_id: string }>('/v1/voices/add', {
      method: 'POST',
      body: form,
    });
    return r.voice_id;
  }
}
