import { describe, expect, it } from 'vitest';
import { bareToolName, gateWrites, gated, isAppPrincipal, isReadToolName } from './approval';

const human = {
  session: {
    id: 's',
    turn: { id: 't' },
    auth: {
      current: { authenticator: 'vitaegis-admin', principalId: 'operator', principalType: 'user' },
      initiator: null,
    },
  },
  toolName: 'x',
  toolInput: undefined,
  approvedTools: [] as string[],
  callId: 'c',
  abortSignal: new AbortController().signal,
};

const app = {
  ...human,
  session: {
    ...human.session,
    auth: {
      current: { authenticator: 'app', principalId: 'eve:app', principalType: 'runtime' },
      initiator: null,
    },
  },
};

// The policies only read `session.auth.current` and `toolName`; the rest is shape.
const ctx = (base: typeof human, toolName: string) =>
  ({ ...base, toolName }) as unknown as Parameters<typeof gated>[0];

describe('bareToolName', () => {
  it('strips the connection prefix', () => {
    expect(bareToolName('stripe__create_product')).toBe('create_product');
    expect(bareToolName('create_product')).toBe('create_product');
  });
});

describe('isReadToolName', () => {
  it('treats list/get/search/fetch/retrieve as reads', () => {
    for (const n of ['list_customers', 'get_balance', 'search_docs', 'fetch_x', 'retrieve_y']) {
      expect(isReadToolName(`stripe__${n}`)).toBe(true);
    }
  });
  it('treats create/update/cancel/delete as writes', () => {
    for (const n of ['create_product', 'update_subscription', 'cancel_subscription', 'delete_x']) {
      expect(isReadToolName(`stripe__${n}`)).toBe(false);
    }
  });
  it('honours extra read names', () => {
    expect(isReadToolName('supabase__execute_sql')).toBe(false);
    expect(isReadToolName('supabase__execute_sql', ['execute_sql'])).toBe(true);
  });
});

describe('isAppPrincipal', () => {
  it('matches only the eve app principal', () => {
    expect(isAppPrincipal(app.session.auth.current)).toBe(true);
    expect(isAppPrincipal(human.session.auth.current)).toBe(false);
    expect(isAppPrincipal(null)).toBe(false);
  });
});

describe('gated', () => {
  it('asks a human caller for approval', async () => {
    expect(await gated(ctx(human, 'approve_post'))).toBe('user-approval');
  });
  it('denies a scheduled run with a reason', async () => {
    const r = await gated(ctx(app, 'approve_post'));
    expect(r).toMatchObject({ type: 'denied' });
  });
});

describe('gateWrites', () => {
  const policy = gateWrites(['execute_sql']);
  it('lets reads through for anyone', async () => {
    expect(await policy(ctx(app, 'stripe__list_products'))).toBe('not-applicable');
    expect(await policy(ctx(app, 'supabase__execute_sql'))).toBe('not-applicable');
  });
  it('gates writes', async () => {
    expect(await policy(ctx(human, 'stripe__create_product'))).toBe('user-approval');
    expect(await policy(ctx(app, 'stripe__create_product'))).toMatchObject({ type: 'denied' });
  });
});
