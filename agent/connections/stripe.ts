import { defineMcpClientConnection } from 'eve/connections';
import { gateWrites } from '../lib/approval';

/**
 * Stripe's hosted MCP server, authenticated with the same secret key the site uses.
 * Reads (list_, retrieve_, search_, get_) run freely; every create/update/cancel pauses for
 * the operator, and is denied outright in a scheduled run.
 */
export default defineMcpClientConnection({
  url: 'https://mcp.stripe.com',
  description:
    'Stripe account: customers, products, prices, payment links, subscriptions, invoices, balance, and documentation search. Read freely; writes need approval.',
  auth: {
    credentialOwner: 'app',
    getToken: async () => ({ token: process.env.STRIPE_SECRET_KEY! }),
  },
  approval: gateWrites(),
});
