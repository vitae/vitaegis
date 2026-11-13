import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment canceled | VITAEGIS',
  robots: { index: false },
};

export default function CancelPage() {
  return (
    <main className="flex min-h-[calc(100svh-var(--nav-top)-var(--nav-bottom))] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Checkout</p>
      <h1 className="text-4xl font-bold uppercase tracking-[0.14em] text-white sm:text-5xl">
        Payment canceled
      </h1>
      <p className="max-w-md text-base text-white/70 sm:text-lg">
        You have not been charged. You can try again whenever you like.
      </p>
      <Link
        href="/#token"
        className="glass-panel glass-panel--lit glass-panel--hover mt-2 inline-flex min-h-[48px] items-center justify-center rounded-lg px-6 text-sm font-medium text-vitae-green"
      >
        Back to the store
      </Link>
    </main>
  );
}
