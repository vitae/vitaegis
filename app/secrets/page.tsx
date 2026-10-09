import type { Metadata } from 'next';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import { pillars } from '@/lib/pillars';
import { secretsAccess } from '@/lib/secrets/access-server';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/token';
import UnlockButton from './_components/UnlockButton';

export const metadata: Metadata = {
  title: 'Secrets | VITAEGIS',
  description: 'The protocols behind Health • Stealth • Wealth. One-time access.',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

const label = 'text-xs uppercase tracking-[0.3em] text-vitae-green/70';

export default async function SecretsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; unlocked?: string }>;
}) {
  const [access, params] = await Promise.all([secretsAccess(), searchParams]);

  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header className="py-12 text-center sm:py-16">
          <p className={label}>Center for Inner Peace</p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl lg:text-6xl">
            Our <span className="text-vitae-green">Secrets</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 sm:text-lg">
            {access
              ? 'The protocols behind everything we build. Yours for a year.'
              : 'The protocols behind everything we build. Health, Stealth and Wealth, step by step.'}
          </p>
        </header>

        {access ? (
          <Unlocked unlockedNow={params.unlocked === '1'} />
        ) : (
          <Paywall failed={params.error === '1'} />
        )}
      </div>
    </main>
  );
}

function Paywall({ failed }: { failed: boolean }) {
  return (
    <GlassContainer variant="prominent" glow padding="lg" className="w-full text-center">
      <p className={label}>Members only</p>
      <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
        Unlock the <span className="text-vitae-green">Wealth of Wisdom</span>
      </h2>
      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-white/70 sm:text-base">
        {pillars.map((p) => (
          <li key={p.slug} className="flex gap-3">
            <span className="text-vitae-green">{p.glyph}</span>
            <span>
              <span className="font-bold uppercase tracking-[0.12em] text-white">{p.name}</span>:{' '}
              {p.protocolTitle.toLowerCase()}, {p.protocol.length} steps.
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <UnlockButton />
      </div>
      {failed && (
        <p className="mt-4 text-sm text-vitae-red">
          That payment could not be confirmed. If you were charged, reply to your Stripe receipt and
          we will unlock you by hand.
        </p>
      )}
      <p className="mt-6 text-xs text-white/40">{SECRETS_PRICE_LABEL}, once. No subscription.</p>
    </GlassContainer>
  );
}

function Unlocked({ unlockedNow }: { unlockedNow: boolean }) {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {unlockedNow && (
        <p className="text-center text-sm text-vitae-green">
          Unlocked. This device keeps access for a year.
        </p>
      )}
      {pillars.map((p) => (
        <GlassContainer key={p.slug} variant="default" glow padding="lg" className="w-full">
          <p className={label}>
            {p.numeral}. {p.codename}
          </p>
          <h2 className="mt-2 text-2xl font-bold uppercase tracking-[0.12em] sm:text-3xl">
            <span className="text-vitae-green">{p.name}</span>
          </h2>
          <p className="mt-3 text-base text-white/70 sm:text-lg">{p.doctrine}</p>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            {p.protocolTitle}
          </h3>
          <ol className="mt-3 space-y-3">
            {p.protocol.map((e, i) => (
              <li key={e.k} className="flex gap-3 text-sm sm:text-base">
                <span className="w-6 shrink-0 text-right text-vitae-green/70">{i + 1}.</span>
                <span>
                  <span className="font-bold text-white">{e.k}</span>{' '}
                  <span className="text-white/70">{e.v}</span>
                </span>
              </li>
            ))}
          </ol>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            Directives
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70 sm:text-base">
            {p.directives.map((d) => (
              <li key={d} className="flex gap-3">
                <span className="text-vitae-green">›</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <Link href={`/${p.slug}`} className={`${label} mt-6 inline-block hover:text-white`}>
            Full {p.name.toLowerCase()} field manual →
          </Link>
        </GlassContainer>
      ))}
    </div>
  );
}
