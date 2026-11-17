import type { Metadata } from 'next';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import UnlockProjectsButton from '@/components/UnlockProjectsButton';
import { projects } from '@/components/projects';
import { LOCKED_PROJECTS, PROJECTS_PRICE_LABEL, namedProject } from '@/lib/projects-access';

export const metadata: Metadata = {
  title: 'Projects access | VITAEGIS',
  robots: { index: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = namedProject((await searchParams).next);
  const shown = (next ? [next] : LOCKED_PROJECTS)
    .map((href) => projects.find((p) => p.href === href))
    .filter((p) => p !== undefined);

  return (
    <main className="flex min-h-[calc(100svh-var(--nav-top)-var(--nav-bottom))] w-full flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <SectionTitle as="h1" tagline={`${PROJECTS_PRICE_LABEL} each. Pay once, keep access.`}>
        Projects
      </SectionTitle>
      <div className="flex w-full max-w-md flex-col gap-4 sm:gap-6">
        {shown.map((p) => {
          const Icon = p.icon;
          return (
            <GlassContainer key={p.href} variant="default" glow lit padding="lg" className="w-full">
              <div className="flex flex-col items-center gap-3">
                <Icon size={32} className="text-vitae-green" />
                <h2 className="text-lg font-semibold text-white">{p.title}</h2>
                <p className="mb-2 text-sm leading-5 text-white/70">{p.description}</p>
                <UnlockProjectsButton project={p.href} />
              </div>
            </GlassContainer>
          );
        })}
      </div>
      <Link
        href="/"
        className="mt-8 text-xs uppercase tracking-[0.3em] text-vitae-green/70 hover:text-white"
      >
        ← Vitaegis
      </Link>
    </main>
  );
}
