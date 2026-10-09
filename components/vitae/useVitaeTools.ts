'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  planNavigation,
  validateOpenPage,
  validateStartCheckout,
  validateSubscribeEmail,
} from '@/lib/vitae/tools';

type Handler = (parameters: Record<string, unknown>) => Promise<string>;

/** The three client tools, validated here before anything happens. Each returns a sentence Vitae speaks. */
export function useVitaeTools(): Record<
  'open_page' | 'start_checkout' | 'subscribe_email',
  Handler
> {
  const router = useRouter();
  const pathname = usePathname();
  return useMemo(
    () => ({
      open_page: async (p) => {
        const v = validateOpenPage(p);
        if (!v.ok) return v.error;
        const nav = planNavigation(v.path, pathname);
        if (nav.kind === 'scroll') {
          document.getElementById(nav.id)?.scrollIntoView({ behavior: 'smooth' });
        } else {
          router.push(nav.path);
        }
        return `Opening ${v.path}.`;
      },
      start_checkout: async (p) => {
        const v = validateStartCheckout(p);
        if (!v.ok) return v.error;
        const url = v.product === 'secrets' ? '/api/secrets/checkout' : '/api/checkout';
        const body =
          v.product === 'secrets'
            ? { origin: window.location.origin }
            : { id: v.product, origin: window.location.origin };
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!res.ok || !json.url) {
            return `Checkout could not start: ${json.error ?? 'try the store page at /#token'}.`;
          }
          window.location.assign(json.url);
          return `Sending you to checkout for ${v.label} at ${v.price}.`;
        } catch {
          return 'Checkout could not start. The store is at /#token.';
        }
      },
      subscribe_email: async (p) => {
        const v = validateSubscribeEmail(p);
        if (!v.ok) return v.error;
        try {
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: v.email, source: 'vitae' }),
          });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!res.ok || !json.ok) {
            return `Could not subscribe: ${json.error ?? 'try the form at /#community'}.`;
          }
          return `You're in. ${v.email} is subscribed.`;
        } catch {
          return 'Could not subscribe right now. The form is at /#community.';
        }
      },
    }),
    [router, pathname],
  );
}
