import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { publicOrigin } from './public-origin';

const post = (origin: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('https://www.vitaegis.com/api/keycrate/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ origin }),
  });

describe('publicOrigin', () => {
  it('honours the page origin when it is a KeyCrate host', async () => {
    expect(await publicOrigin(post('https://www.glowwitdaflow.com'))).toBe(
      'https://www.glowwitdaflow.com',
    );
    expect(await publicOrigin(post('HTTPS://GlowWitDaFlow.com '))).toBe(
      'https://glowwitdaflow.com',
    );
  });

  it('ignores origins that are not KeyCrate hosts', async () => {
    expect(await publicOrigin(post('https://evil.example'))).toBe('https://www.vitaegis.com');
    expect(await publicOrigin(post(42))).toBe('https://www.vitaegis.com');
  });

  it('falls back to a forwarded KeyCrate host, then the request origin', async () => {
    expect(await publicOrigin(post(undefined, { 'x-forwarded-host': 'glowwitdaflow.com' }))).toBe(
      'https://glowwitdaflow.com',
    );
    expect(
      await publicOrigin(
        new NextRequest('https://www.vitaegis.com/api/keycrate/portal', { method: 'POST' }),
      ),
    ).toBe('https://www.vitaegis.com');
  });
});
