import type { Metadata } from 'next';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import VitaePanel from '@/components/vitae/VitaePanel';
import { vitaeClientEnabled } from '@/lib/vitae/env';

export const metadata: Metadata = {
  title: 'Vitae | VITAEGIS',
  description: 'Talk to Vitae, the voice of Vitaegis.',
};

const label = 'text-xs uppercase tracking-[0.3em] text-vitae-green/70';

export default function VitaePage() {
  const enabled = vitaeClientEnabled();
  return (
    <main className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6">
        <section className="relative flex flex-col items-center py-10 text-center sm:py-14">
          <SectionTitle
            as="h1"
            tagline="Tap, speak, listen. Vitae answers in the voice of Vitaegis."
          >
            Vitae
          </SectionTitle>

          <GlassContainer variant="prominent" glow padding="lg" className="w-full">
            {enabled ? (
              <VitaePanel />
            ) : (
              <p className="text-base text-white/70 sm:text-lg">Vitae is being tuned. Soon.</p>
            )}
          </GlassContainer>

          <p className="mt-8 max-w-md text-xs text-white/40 sm:mt-10">
            Vitae is an AI. It can open pages, start a checkout after you say yes, and subscribe
            your email. Conversations are handled by ElevenLabs and are not stored by vitaegis.com.
          </p>

          <Link href="/" className={`${label} mt-8 hover:text-white sm:mt-10`}>
            ← Vitaegis
          </Link>
        </section>
      </div>
    </main>
  );
}
