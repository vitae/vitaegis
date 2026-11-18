import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { adminAuthed, adminAuthedByLink, cronAuthed, secretsMatch } from './admin-auth';

const URL = 'https://www.vitaegis.com/api/admin/overview';
const req = (headers: Record<string, string> = {}, query = '') =>
  new NextRequest(URL + query, { headers });

beforeEach(() => {
  vi.stubEnv('CONTENT_ADMIN_KEY', 'admin-key');
  vi.stubEnv('CRON_SECRET', 'cron-key');
});
afterEach(() => vi.unstubAllEnvs());

describe('secretsMatch', () => {
  it('matches only the exact secret', () => {
    expect(secretsMatch('abc', 'abc')).toBe(true);
    expect(secretsMatch('abd', 'abc')).toBe(false);
    expect(secretsMatch('abcd', 'abc')).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(null, 'abc')).toBe(false);
    expect(secretsMatch('abc', undefined)).toBe(false);
  });
});

describe('adminAuthed', () => {
  it('accepts the key in the x-admin-key header only', () => {
    expect(adminAuthed(req({ 'x-admin-key': 'admin-key' }))).toBe(true);
    expect(adminAuthed(req({ 'x-admin-key': 'wrong' }))).toBe(false);
    expect(adminAuthed(req())).toBe(false);
    expect(adminAuthed(req({}, '?key=admin-key'))).toBe(false);
  });

  it('lets nobody in when no key is configured', () => {
    vi.stubEnv('CONTENT_ADMIN_KEY', '');
    expect(adminAuthed(req({ 'x-admin-key': '' }))).toBe(false);
    expect(adminAuthedByLink(req({}, '?key='))).toBe(false);
  });
});

describe('adminAuthedByLink', () => {
  it('also accepts the key as ?key=', () => {
    expect(adminAuthedByLink(req({}, '?key=admin-key'))).toBe(true);
    expect(adminAuthedByLink(req({ 'x-admin-key': 'admin-key' }))).toBe(true);
    expect(adminAuthedByLink(req({}, '?key=wrong'))).toBe(false);
  });
});

describe('cronAuthed', () => {
  it('accepts the secret as a bearer token', () => {
    expect(cronAuthed(req({ authorization: 'Bearer cron-key' }))).toBe(true);
    expect(cronAuthed(req({ authorization: 'Bearer wrong' }))).toBe(false);
    expect(cronAuthed(req({ authorization: 'cron-key' }))).toBe(false);
    expect(cronAuthed(req())).toBe(false);
  });

  it('with no secret set, is open in development and closed in production', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(cronAuthed(req())).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(cronAuthed(req())).toBe(false);
    expect(cronAuthed(req({ authorization: 'Bearer ' }))).toBe(false);
  });
});
