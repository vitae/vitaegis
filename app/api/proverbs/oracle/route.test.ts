import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ask } = vi.hoisted(() => ({
  ask: vi.fn(async () => ({ content: [{ type: 'text', text: 'wisdom' }] })),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: ask };
  },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

import { POST } from './route';

let caller = 0;
const post = (body: string, ip = `198.51.100.${++caller}`) =>
  new Request('https://www.vitaegis.com/api/proverbs/oracle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body,
  });
const statusFor = async (body: string) => (await POST(post(body))).status;

beforeEach(() => ask.mockClear());

describe('POST /api/proverbs/oracle', () => {
  it('answers a question', async () => {
    const res = await POST(post(JSON.stringify({ message: 'What is wealth?' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: 'wisdom' });
  });

  it('rejects a missing, blank or non-text message without calling the model', async () => {
    expect(await statusFor(JSON.stringify({}))).toBe(400);
    expect(await statusFor(JSON.stringify({ message: '   ' }))).toBe(400);
    expect(await statusFor(JSON.stringify({ message: 42 }))).toBe(400);
    expect(await statusFor('not json')).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it('rejects a message over the length cap', async () => {
    expect(await statusFor(JSON.stringify({ message: 'x'.repeat(2001) }))).toBe(400);
    expect(await statusFor(JSON.stringify({ message: 'x'.repeat(2000) }))).toBe(200);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('stops one caller after ten questions in a minute', async () => {
    const ip = '203.0.113.70';
    const body = JSON.stringify({ message: 'Again?' });
    for (let i = 0; i < 10; i++) expect((await POST(post(body, ip))).status).toBe(200);
    expect((await POST(post(body, ip))).status).toBe(429);
    expect(ask).toHaveBeenCalledTimes(10);
  });
});
