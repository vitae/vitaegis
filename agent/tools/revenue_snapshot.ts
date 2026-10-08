import { defineTool } from 'eve/tools';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2023-10-16' });
};

const dollars = (cents: number, currency = 'usd') =>
  `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

export default defineTool({
  description:
    'Revenue snapshot from Stripe: gross and net over a window, charge count, refunds, active subscriptions and their MRR, and the current balance. Read-only. For anything deeper (a customer, an invoice, a product list) use the stripe connection.',
  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(30),
  }),
  label: { start: ({ days }) => `Stripe snapshot, last ${days} days` },
  async execute({ days }) {
    const s = stripe();
    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const charges: Stripe.Charge[] = [];
    for await (const c of s.charges.list({ created: { gte: since }, limit: 100 })) {
      charges.push(c);
      if (charges.length >= 1000) break;
    }
    const paid = charges.filter((c) => c.paid && c.status === 'succeeded');
    const gross = paid.reduce((a, c) => a + c.amount, 0);
    const refunded = paid.reduce((a, c) => a + c.amount_refunded, 0);
    const currency = paid[0]?.currency ?? 'usd';

    const subs: Stripe.Subscription[] = [];
    for await (const sub of s.subscriptions.list({ status: 'active', limit: 100 })) {
      subs.push(sub);
      if (subs.length >= 500) break;
    }
    const mrr = subs.reduce((a, sub) => {
      return (
        a +
        sub.items.data.reduce((b, item) => {
          const p = item.price;
          const amount = (p.unit_amount ?? 0) * (item.quantity ?? 1);
          if (p.recurring?.interval === 'year') return b + amount / 12;
          if (p.recurring?.interval === 'week') return b + amount * 4.33;
          if (p.recurring?.interval === 'day') return b + amount * 30;
          return b + amount / (p.recurring?.interval_count ?? 1);
        }, 0)
      );
    }, 0);

    const balance = await s.balance.retrieve();
    const byProduct: Record<string, number> = {};
    for (const c of paid) {
      const name = c.description ?? c.statement_descriptor ?? 'unlabelled';
      byProduct[name] = (byProduct[name] ?? 0) + c.amount;
    }

    return {
      windowDays: days,
      charges: paid.length,
      gross: dollars(gross, currency),
      refunded: dollars(refunded, currency),
      net: dollars(gross - refunded, currency),
      byDescription: Object.fromEntries(
        Object.entries(byProduct)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([k, v]) => [k, dollars(v, currency)]),
      ),
      activeSubscriptions: subs.length,
      mrr: dollars(Math.round(mrr), currency),
      balance: {
        available: balance.available.map((b) => dollars(b.amount, b.currency)),
        pending: balance.pending.map((b) => dollars(b.amount, b.currency)),
      },
      livemode: paid[0]?.livemode ?? null,
    };
  },
});
