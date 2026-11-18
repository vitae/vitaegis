import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  configured: true,
  upsert: vi.fn(async (_row: { email: string; source: string }, _options: object) => ({
    error: null,
  })),
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => (db.configured ? { from: () => ({ upsert: db.upsert }) } : null),
}));

import { POST } from './route';

let caller = 0;
const post = (body: unknown, ip = `198.51.100.${++caller}`) =>
  new NextRequest('https://www.vitaegis.com/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  db.configured = true;
  db.upsert.mockClear();
});

describe('POST /api/subscribe', () => {
  it('saves a normalized email with its source', async () => {
    const res = await POST(post({ email: '  Ada@Example.com ', source: 'vitae' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.upsert.mock.calls[0][0]).toEqual({ email: 'ada@example.com', source: 'vitae' });
  });

  it('files an unknown source under home', async () => {
    await POST(post({ email: 'ada@example.com', source: 'elsewhere' }));
    expect(db.upsert.mock.calls[0][0].source).toBe('home');
  });

  it('rejects something that is not an email address', async () => {
    expect((await POST(post({ email: 'not-an-email' }))).status).toBe(400);
    expect((await POST(post({ email: 42 }))).status).toBe(400);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('answers 503 when Supabase is not configured', async () => {
    db.configured = false;
    expect((await POST(post({ email: 'ada@example.com' }))).status).toBe(503);
  });

  it('stops one caller after eight tries in a window', async () => {
    const ip = '203.0.113.60';
    for (let i = 0; i < 8; i++) {
      expect((await POST(post({ email: `a${i}@example.com` }, ip))).status).toBe(200);
    }
    expect((await POST(post({ email: 'a9@example.com' }, ip))).status).toBe(429);
    expect(db.upsert).toHaveBeenCalledTimes(8);
  });
});
