import { STORE_PRODUCTS, formatPrice } from '@/lib/store';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/price';
import { allowedPaths } from './sitemap';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · tools
   The three client tools Vitae may call, in the shape ElevenLabs stores them, and
   the validators the browser runs before acting. Pure; tested. Imported by client
   code, so nothing here may pull in Node-only modules.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type VitaeToolName = 'open_page' | 'start_checkout' | 'subscribe_email';

export interface VitaeToolDef {
  name: VitaeToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: 'string'; description: string }>;
    required: string[];
  };
  expects_response: true;
}

const productIds = STORE_PRODUCTS.map((p) => p.id);

export const VITAE_TOOLS: VitaeToolDef[] = [
  {
    name: 'open_page',
    description:
      'Open a page on vitaegis.com for the visitor. Use only when they ask to go somewhere. Paths: ' +
      [...allowedPaths()].join(', '),
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'A site path such as /stealth or /#token.' },
      },
      required: ['path'],
    },
    expects_response: true,
  },
  {
    name: 'start_checkout',
    description:
      'Send the visitor to Stripe Checkout. Call only after you have said the product name and price and they said yes. product is one of: ' +
      [...productIds, 'secrets'].join(', '),
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Store product id, or "secrets".' },
      },
      required: ['product'],
    },
    expects_response: true,
  },
  {
    name: 'subscribe_email',
    description:
      'Subscribe the visitor to Vitaegis updates. Call only after they have said their email address. Read it back before calling.',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'The email address exactly as the visitor said it.',
        },
      },
      required: ['email'],
    },
    expects_response: true,
  },
];

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

const str = (args: unknown, key: string): string | null => {
  if (!args || typeof args !== 'object') return null;
  const v = (args as Record<string, unknown>)[key];
  return typeof v === 'string' ? v.trim() : null;
};

export function validateOpenPage(args: unknown): Ok<{ path: string }> | Fail {
  const raw = str(args, 'path');
  if (!raw) return { ok: false, error: 'No path given.' };
  if (raw.includes('..') || raw.startsWith('//') || /^[a-z]+:/i.test(raw)) {
    return { ok: false, error: 'Only pages on vitaegis.com can be opened.' };
  }
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
  if (!allowedPaths().has(path)) {
    return {
      ok: false,
      error: `Unknown page ${path}. Known pages: ${[...allowedPaths()].join(', ')}.`,
    };
  }
  return { ok: true, path };
}

export function validateStartCheckout(
  args: unknown,
): Ok<{ product: string; label: string; price: string }> | Fail {
  const product = str(args, 'product')?.toLowerCase() ?? null;
  if (product === 'secrets') {
    return { ok: true, product, label: 'Vitaegis Secrets', price: SECRETS_PRICE_LABEL };
  }
  const found = STORE_PRODUCTS.find((p) => p.id === product);
  if (!found) {
    return {
      ok: false,
      error: `Unknown product. Use one of: ${[...productIds, 'secrets'].join(', ')}.`,
    };
  }
  return { ok: true, product: found.id, label: found.name, price: formatPrice(found.priceCents) };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}

export function validateSubscribeEmail(args: unknown): Ok<{ email: string }> | Fail {
  const email = normalizeEmail(str(args, 'email'));
  return email
    ? { ok: true, email }
    : { ok: false, error: 'That does not look like an email address.' };
}
