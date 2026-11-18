import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { conversationToken } = vi.hoisted(() => ({
  conversationToken: vi.fn(async () => 'tok_1'),
}));
vi.mock('@/lib/vitae/elevenlabs', () => ({
  ElevenLabs: class {
    conversationToken = conversationToken;
  },
  ElevenLabsError: class extends Error {
    status = 500;
  },
}));

import { POST } from './route';

const SITE = 'https://www.vitaegis.com';
let caller = 0;
const post = (headers: Record<string, string> = {}) =>
  new NextRequest(`${SITE}/api/vitae/token`, {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${++caller}`, ...headers },
  });

beforeEach(() => {
  vi.stubEnv('ELEVENLABS_API_KEY', 'el-key');
  vi.stubEnv('ELEVENLABS_AGENT_ID', 'agent_1');
  conversationToken.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/vitae/token', () => {
  it('mints a token for the site itself and for GWDF', async () => {
    const own = await POST(post({ origin: SITE }));
    expect(own.status).toBe(200);
    expect(await own.json()).toEqual({ token: 'tok_1' });
    expect((await POST(post({ origin: 'https://www.glowwitdaflow.com' }))).status).toBe(200);
    expect(conversationToken).toHaveBeenCalledWith('agent_1');
  });

  it('refuses a request with no Origin or a foreign one', async () => {
    expect((await POST(post())).status).toBe(403);
    expect((await POST(post({ origin: 'https://evil.example' }))).status).toBe(403);
    expect(conversationToken).not.toHaveBeenCalled();
  });

  it('answers 503 when ElevenLabs is not configured', async () => {
    vi.stubEnv('ELEVENLABS_AGENT_ID', '');
    expect((await POST(post({ origin: SITE }))).status).toBe(503);
  });

  it('stops one caller after six sessions in a window', async () => {
    const headers = { origin: SITE, 'x-forwarded-for': '203.0.113.50' };
    for (let i = 0; i < 6; i++) expect((await POST(post(headers))).status).toBe(200);
    const blocked = await POST(post(headers));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(conversationToken).toHaveBeenCalledTimes(6);
  });

  it('hides the upstream failure behind a 502', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    conversationToken.mockRejectedValueOnce(new Error('xi-api-key rejected'));
    const res = await POST(post({ origin: SITE }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('xi-api-key');
  });
});
