import { describe, expect, it } from 'vitest';
import { lockedProject, namedProject, signAccess, verifyAccess } from './projects-access';

describe('projects paywall', () => {
  it('matches locked pages and their subpaths only', () => {
    expect(lockedProject('/travel')).toBe('/travel');
    expect(lockedProject('/Stocks/aapl')).toBe('/stocks');
    expect(lockedProject('/travelogue')).toBeNull();
    expect(lockedProject('/')).toBeNull();
  });

  it('only names a locked project', () => {
    expect(namedProject('/vitamins')).toBe('/vitamins');
    expect(namedProject('https://evil.example')).toBeNull();
    expect(namedProject('/admin')).toBeNull();
    expect(namedProject(undefined)).toBeNull();
  });

  it('accepts its own signature for that project and rejects anything else', async () => {
    const token = await signAccess('/travel', 'cs_test_123', 'secret');
    expect(await verifyAccess(token, '/travel', 'secret')).toBe(true);
    expect(await verifyAccess(token, '/stocks', 'secret')).toBe(false);
    expect(await verifyAccess(token, '/travel', 'other-secret')).toBe(false);
    expect(await verifyAccess(token.replace('123', '999'), '/travel', 'secret')).toBe(false);
    expect(await verifyAccess('cs_test_123', '/travel', 'secret')).toBe(false);
    expect(await verifyAccess(undefined, '/travel', 'secret')).toBe(false);
  });
});
