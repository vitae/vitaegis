import { describe, expect, it } from 'vitest';
import {
  VITAE_TOOLS,
  normalizeEmail,
  planNavigation,
  validateOpenPage,
  validateStartCheckout,
  validateSubscribeEmail,
} from './tools';
import { SITE_MAP, allowedPaths } from './sitemap';

describe('site map', () => {
  it('every path starts with a single slash and has a title', () => {
    for (const p of SITE_MAP) {
      expect(p.path.startsWith('/')).toBe(true);
      expect(p.path.startsWith('//')).toBe(false);
      expect(p.title.length).toBeGreaterThan(0);
    }
  });
  it('includes the three pillars, books, store, secrets and vitae', () => {
    const paths = allowedPaths();
    for (const p of ['/health', '/stealth', '/wealth', '/books', '/#token', '/secrets', '/vitae']) {
      expect(paths.has(p)).toBe(true);
    }
  });
});

describe('tool definitions', () => {
  it('declares the three tools, all waiting for a response', () => {
    expect(VITAE_TOOLS.map((t) => t.name)).toEqual([
      'open_page',
      'start_checkout',
      'subscribe_email',
    ]);
    for (const t of VITAE_TOOLS) expect(t.expects_response).toBe(true);
  });
});

describe('validateOpenPage', () => {
  it('accepts an allowlisted path', () => {
    expect(validateOpenPage({ path: '/stealth' })).toEqual({ ok: true, path: '/stealth' });
  });
  it('accepts a path with a trailing slash by trimming to the allowlisted path', () => {
    expect(validateOpenPage({ path: '/stealth/' })).toEqual({ ok: true, path: '/stealth' });
  });
  it('rejects external, protocol-relative, traversal and unknown paths', () => {
    for (const bad of [
      'https://youtube.com',
      '//evil.com',
      '/secrets/../admin',
      '/admin',
      'stealth',
      '',
    ]) {
      expect(validateOpenPage({ path: bad }).ok).toBe(false);
    }
    expect(validateOpenPage(null).ok).toBe(false);
  });
});

describe('validateStartCheckout', () => {
  it('accepts a store product id and returns its label and price', () => {
    expect(validateStartCheckout({ product: 'tai-chi-flow' })).toEqual({
      ok: true,
      product: 'tai-chi-flow',
      label: 'Tai Chi Flow',
      price: '$9.99',
    });
  });
  it('accepts secrets', () => {
    expect(validateStartCheckout({ product: 'secrets' })).toEqual({
      ok: true,
      product: 'secrets',
      label: 'Vitaegis Secrets',
      price: '$9.99',
    });
  });
  it('rejects names and unknown ids and lists the valid ones', () => {
    const r = validateStartCheckout({ product: 'Matcha Green Tea' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('matcha');
  });
});

describe('emails', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeEmail('  Anthony@Example.com ')).toBe('anthony@example.com');
  });
  it('rejects addresses over 254 characters', () => {
    expect(normalizeEmail('a'.repeat(250) + '@b.co')).toBeNull();
    expect(normalizeEmail('a'.repeat(240) + '@b.co')).not.toBeNull();
  });
  it('rejects malformed addresses', () => {
    for (const bad of ['anthony@', '@example.com', 'anthony', 'a b@example.com', '', null, 42]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
  it('validateSubscribeEmail wraps normalizeEmail', () => {
    expect(validateSubscribeEmail({ email: 'A@B.co' })).toEqual({ ok: true, email: 'a@b.co' });
    expect(validateSubscribeEmail({ email: 'nope' }).ok).toBe(false);
  });
});

describe('planNavigation', () => {
  it('scrolls to the section when already on the home page', () => {
    expect(planNavigation('/#token', '/')).toEqual({ kind: 'scroll', id: 'token' });
  });
  it('pushes a hash path from another page instead of reloading', () => {
    expect(planNavigation('/#token', '/books')).toEqual({ kind: 'push', path: '/#token' });
  });
  it('pushes plain paths', () => {
    expect(planNavigation('/stealth', '/')).toEqual({ kind: 'push', path: '/stealth' });
  });
});
