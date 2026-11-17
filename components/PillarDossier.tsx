import Link from 'next/link';
import Footer from '@/components/Footer';
import GlassContainer from '@/components/GlassContainer';
import MatrixRainLazy from '@/components/MatrixRainLazy';
import OpenHashDetails from '@/components/OpenHashDetails';
import SectionTitle from '@/components/SectionTitle';
import HeroSection from '@/components/sections/HeroSection';
import { pillars, type Pillar } from '@/lib/pillars';
import { LETTER, tenetId } from '@/lib/tenets';

const section = 'relative flex w-full flex-col items-center py-10 text-center sm:py-14';
const label = 'text-xs font-medium uppercase tracking-[0.2em] text-vitae-green';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Pillar page (/health, /stealth, /wealth)
   The same format as the home page: rain, the hero box, then titled sections of glass
   boxes and the footer. Every tenet keeps its registry ID (see lib/tenets.ts).
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function PillarDossier({ pillar }: { pillar: Pillar }) {
  const L = LETTER[pillar.slug];
  const Tag = ({ id }: { id: string }) => (
    <a
      href={`#${id}`}
      className="ml-2 inline-block min-h-0 whitespace-nowrap rounded-full border border-vitae-green/40 px-2 py-px align-middle font-mono text-xs tracking-[0.12em] text-vitae-green opacity-60 transition hover:opacity-100"
      title={`Tenet ${id}`}
    >
      {id}
    </a>
  );
  const others = pillars.filter((p) => p.slug !== pillar.slug);

  return (
    <div className="app-shell mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col items-center px-4 sm:px-6">
      <MatrixRainLazy />
      <OpenHashDetails />

      <main className="app-content relative z-10 flex w-full flex-col items-center">
        <HeroSection
          title={pillar.name.toUpperCase()}
          tagline={pillar.codename}
          enterHref="#about"
        />

        <section id="about" className={section}>
          <div className="section-container min-w-0">
            <SectionTitle>About</SectionTitle>
            <GlassContainer
              variant="default"
              glow
              lit
              padding="lg"
              className="reveal mx-auto w-full max-w-3xl"
            >
              <div className="flex flex-col items-center gap-5 text-base leading-relaxed text-white/80 sm:text-lg">
                <p>{pillar.doctrine}</p>
                <p>{pillar.summary}</p>
              </div>
            </GlassContainer>
          </div>
        </section>

        <section id="directives" className={section}>
          <div className="section-container min-w-0">
            <SectionTitle>Directives</SectionTitle>
            <GlassContainer
              variant="default"
              glow
              lit
              padding="lg"
              className="reveal mx-auto w-full max-w-3xl text-left"
            >
              <ol className="divide-y divide-white/10">
                {pillar.directives.map((d, i) => (
                  <li
                    key={d}
                    id={tenetId(`${L}-00`, i + 1)}
                    className="grid scroll-mt-24 grid-cols-[3rem_1fr] py-3"
                  >
                    <span className="text-2xl font-light leading-none text-vitae-green">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-white/80">
                      {d}
                      <Tag id={tenetId(`${L}-00`, i + 1)} />
                    </span>
                  </li>
                ))}
              </ol>
            </GlassContainer>
          </div>
        </section>

        <section id="protocol" className={section}>
          <div className="section-container min-w-0">
            <SectionTitle>Protocol</SectionTitle>
            <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {pillar.protocol.map((p, i) => (
                <li key={p.k} id={tenetId(`${L}-P`, i + 1)} className="scroll-mt-24">
                  <GlassContainer
                    variant="default"
                    glow
                    lit
                    padding="md"
                    className="reveal h-full text-center"
                  >
                    <p className={label}>
                      {p.k}
                      <Tag id={tenetId(`${L}-P`, i + 1)} />
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{p.v}</p>
                  </GlassContainer>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="files" className={section}>
          <div className="section-container min-w-0">
            <SectionTitle>Files</SectionTitle>
            <div className="flex w-full flex-col gap-4 text-left sm:gap-6">
              {pillar.dossiers.map((d, i) => (
                <details
                  key={d.code}
                  id={d.code}
                  open={i === 0}
                  className="reveal group glass-panel scroll-mt-8 rounded-xl"
                >
                  <summary className="relative z-10 flex cursor-pointer list-none items-baseline gap-4 p-4 sm:p-6 [&::-webkit-details-marker]:hidden">
                    <span className={label}>{d.code}</span>
                    <h3 className="flex-1 text-lg font-semibold text-white sm:text-xl">
                      {d.title}
                    </h3>
                    <span
                      className="text-xl text-vitae-green transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <div className="relative z-10 px-4 pb-4 sm:px-6 sm:pb-6">
                    <p className="leading-relaxed text-white/70">{d.brief}</p>
                    <dl className="mt-4 divide-y divide-white/10">
                      {d.entries.map((e, j) => (
                        <div
                          key={e.k}
                          id={tenetId(d.code, j + 1)}
                          className="grid scroll-mt-24 gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6"
                        >
                          <dt className="font-medium text-vitae-green">
                            {e.k}
                            <Tag id={tenetId(d.code, j + 1)} />
                          </dt>
                          <dd className="leading-relaxed text-white/80">{e.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {pillar.related.length > 0 && (
          <section id="posts" className={section}>
            <div className="section-container min-w-0">
              <SectionTitle>Posts</SectionTitle>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {pillar.related.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="reveal glass-panel glass-panel--hover flex h-full flex-col items-center gap-2 rounded-xl p-4 text-center sm:p-6"
                  >
                    <span className="relative z-10 text-lg font-semibold text-white">
                      {r.label}
                    </span>
                    {r.blurb && (
                      <span className="relative z-10 text-sm leading-5 text-white/70">
                        {r.blurb}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="pillars" className={section}>
          <div className="section-container min-w-0">
            <SectionTitle>Pillars</SectionTitle>
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/${o.slug}`}
                  className="reveal glass-panel glass-panel--hover flex h-full flex-col items-center gap-3 rounded-xl p-4 text-center sm:p-6"
                >
                  <span className={`${label} relative z-10`}>{o.codename}</span>
                  <span className="relative z-10 text-2xl font-bold uppercase tracking-[0.15em] text-vitae-green">
                    {o.name}
                  </span>
                  <span className="relative z-10 text-sm leading-5 text-white/70">{o.summary}</span>
                </Link>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-white/60 sm:mt-10">
              {pillar.disclaimer}
            </p>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
