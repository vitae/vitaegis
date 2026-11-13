import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Order confirmed | VITAEGIS', robots: { index: false } };

export default function SuccessPage() {
  return (
    <main className="flex min-h-[calc(100svh-var(--nav-top)-var(--nav-bottom))] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-vitae-green/80">Order confirmed</p>
      <h1
        className="text-4xl font-bold uppercase tracking-[0.14em] text-vitae-green sm:text-5xl"
        style={{ textShadow: '0 0 28px rgba(0,255,0,0.35)' }}
      >
        Payment received
      </h1>
      <p className="max-w-md text-base text-white/70 sm:text-lg">
        Thank you. A receipt is on its way to your email.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-vitae-green px-6 text-sm font-medium tracking-[0.08em] text-black shadow-neon-sm transition-shadow hover:shadow-neon-md"
      >
        BACK TO VITAEGIS
      </Link>
    </main>
  );
}
