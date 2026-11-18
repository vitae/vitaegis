import { describe, expect, it } from 'vitest';
import { clientIp, rateLimit, tooMany } from './rate-limit';

const T = 1_700_000_000_000;
const MINUTE = 60_000;

describe('rateLimit', () => {
  it('allows up to the limit in a window, then refuses with the wait', () => {
    expect(rateLimit('limit', 2, MINUTE, T)).toEqual({ ok: true, retryAfterS: 0 });
    expect(rateLimit('limit', 2, MINUTE, T + 1000)).toEqual({ ok: true, retryAfterS: 0 });
    expect(rateLimit('limit', 2, MINUTE, T + 2000)).toEqual({ ok: false, retryAfterS: 58 });
  });

  it('starts a fresh window once the old one has ended', () => {
    rateLimit('window', 1, MINUTE, T);
    expect(rateLimit('window', 1, MINUTE, T + MINUTE - 1).ok).toBe(false);
    expect(rateLimit('window', 1, MINUTE, T + MINUTE).ok).toBe(true);
  });

  it('counts each key on its own', () => {
    rateLimit('one', 1, MINUTE, T);
    expect(rateLimit('one', 1, MINUTE, T).ok).toBe(false);
    expect(rateLimit('two', 1, MINUTE, T).ok).toBe(true);
  });

  it('forgets its counts rather than grow without bound', () => {
    rateLimit('held', 1, MINUTE, T);
    expect(rateLimit('held', 1, MINUTE, T).ok).toBe(false);
    for (let i = 0; i < 5000; i++) rateLimit(`flood-${i}`, 1, MINUTE, T);
    expect(rateLimit('held', 1, MINUTE, T).ok).toBe(true);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) => new Request('https://x.test/', { headers });

  it('reads the first forwarded address, then x-real-ip', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(req({ 'x-real-ip': '203.0.113.8' }))).toBe('203.0.113.8');
    expect(clientIp(req({}))).toBe('unknown');
  });
});

describe('tooMany', () => {
  it('answers 429 with the wait in Retry-After', async () => {
    const res = tooMany('Slow down.', 42);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('42');
    expect(await res.json()).toEqual({ error: 'Slow down.' });
  });
});
