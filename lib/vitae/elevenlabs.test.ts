import { describe, expect, it, vi } from 'vitest';
import { ElevenLabs, ElevenLabsError } from './elevenlabs';

function fakeFetch(
  handler: (url: string, init: RequestInit) => { status?: number; json?: unknown; text?: string },
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const r = handler(url, init);
    const body = r.text ?? JSON.stringify(r.json ?? {});
    return new Response(body, {
      status: r.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('ElevenLabs client', () => {
  it('sends the api key header and parses the conversation token', async () => {
    const f = fakeFetch(() => ({ json: { token: 'tok_1' } }));
    const el = new ElevenLabs('key_1', f.fn);
    expect(await el.conversationToken('agent_1')).toBe('tok_1');
    expect(f.calls[0].url).toBe(
      'https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_1',
    );
    expect((f.calls[0].init.headers as Record<string, string>)['xi-api-key']).toBe('key_1');
  });

  it('creates a client tool and returns its id', async () => {
    const f = fakeFetch(() => ({ json: { id: 'tool_9' } }));
    const el = new ElevenLabs('k', f.fn);
    const id = await el.createTool({
      name: 'open_page',
      description: 'd',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'p' } },
        required: ['path'],
      },
      expects_response: true,
    });
    expect(id).toBe('tool_9');
    const body = JSON.parse(f.calls[0].init.body as string);
    expect(body.tool_config.type).toBe('client');
    expect(body.tool_config.name).toBe('open_page');
    expect(f.calls[0].init.method).toBe('POST');
  });

  it('lists tools as id and name pairs', async () => {
    const f = fakeFetch(() => ({
      json: { tools: [{ id: 't1', tool_config: { name: 'open_page' } }] },
    }));
    const el = new ElevenLabs('k', f.fn);
    expect(await el.listTools()).toEqual([{ id: 't1', name: 'open_page' }]);
  });

  it('lists and deletes knowledge documents by prefix', async () => {
    const f = fakeFetch((url) =>
      url.includes('/knowledge-base?')
        ? { json: { documents: [{ id: 'd1', name: 'vitae:store' }] } }
        : { json: {} },
    );
    const el = new ElevenLabs('k', f.fn);
    expect(await el.listKnowledge('vitae:')).toEqual([{ id: 'd1', name: 'vitae:store' }]);
    await el.deleteKnowledge('d1');
    expect(f.calls[1].url).toBe('https://api.elevenlabs.io/v1/convai/knowledge-base/d1?force=true');
    expect(f.calls[1].init.method).toBe('DELETE');
  });

  it('throws ElevenLabsError with status and body on failure', async () => {
    const f = fakeFetch(() => ({ status: 422, text: '{"detail":"bad"}' }));
    const el = new ElevenLabs('k', f.fn);
    await expect(el.conversationToken('a')).rejects.toBeInstanceOf(ElevenLabsError);
    await expect(el.conversationToken('a')).rejects.toMatchObject({ status: 422 });
  });

  it('refuses to construct without a key', () => {
    expect(() => new ElevenLabs('')).toThrow(/ELEVENLABS_API_KEY/);
  });
});
