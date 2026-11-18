import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { create } = vi.hoisted(() => ({
  create: vi.fn(async (_params: { amount: number; metadata: { tickets: string } }) => ({
    client_secret: 'pi_secret_1',
  })),
}));
vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create };
  },
}));

import { POST } from './route';

const post = (body: string) =>
  new NextRequest('https://www.vitaegis.com/api/create-payment-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
const amountFor = async (quantity: unknown) => {
  create.mockClear();
  await POST(post(JSON.stringify({ quantity })));
  return create.mock.calls[0][0].amount;
};

beforeEach(() => create.mockClear());
afterEach(() => vi.restoreAllMocks());

describe('POST /api/create-payment-intent', () => {
  it('charges nine dollars a ticket and returns the client secret', async () => {
    const res = await POST(post(JSON.stringify({ quantity: 3 })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: 'pi_secret_1' });
    expect(create.mock.calls[0][0].amount).toBe(2700);
    expect(create.mock.calls[0][0].metadata.tickets).toBe('3');
  });

  it('keeps the quantity between one and ten', async () => {
    expect(await amountFor(99)).toBe(9000);
    expect(await amountFor(0)).toBe(900);
    expect(await amountFor(-4)).toBe(900);
  });

  it('falls back to one ticket for anything that is not a whole number', async () => {
    expect(await amountFor('abc')).toBe(900);
    expect(await amountFor(2.5)).toBe(900);
    expect(await amountFor(undefined)).toBe(900);
    create.mockClear();
    await POST(post('not json'));
    expect(create.mock.calls[0][0].amount).toBe(900);
  });

  it('never returns Stripe error detail or a stack trace', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    create.mockRejectedValueOnce(new Error('No such product: prod_internal'));
    const res = await POST(post(JSON.stringify({ quantity: 1 })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Could not start the payment. Try again.' });
  });
});
