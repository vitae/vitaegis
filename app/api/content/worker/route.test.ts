import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { runDueJobs } = vi.hoisted(() => ({ runDueJobs: vi.fn(async (_max: number) => 2) }));
vi.mock('@/lib/pipeline', () => ({ runDueJobs }));

import { GET } from './route';

const get = (headers: Record<string, string> = {}) =>
  new NextRequest('https://www.vitaegis.com/api/content/worker', { headers });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'cron-key');
  runDueJobs.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/content/worker', () => {
  it('runs due jobs for a caller holding the cron secret', async () => {
    const res = await GET(get({ authorization: 'Bearer cron-key' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ran: 2 });
  });

  it('refuses everyone else', async () => {
    expect((await GET(get())).status).toBe(403);
    expect((await GET(get({ authorization: 'Bearer wrong' }))).status).toBe(403);
    expect(runDueJobs).not.toHaveBeenCalled();
  });

  it('stays closed in production when no secret is set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect((await GET(get())).status).toBe(403);
    expect(runDueJobs).not.toHaveBeenCalled();
  });
});
