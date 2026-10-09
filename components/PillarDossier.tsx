import Link from 'next/link';
import OpenHashDetails from '@/components/OpenHashDetails';
import { pillars, type Pillar } from '@/lib/pillars';
import { LETTER, tenetId } from '@/lib/tenets';

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em]';

export default function PillarDossier({ pillar }: { pillar: Pillar }) {
  const c = pillar.color;
  const L = LETTER[pillar.slug];
  // Every tenet carries its registry ID (see lib/tenets.ts) so a card can be traced here.
  const Tag = ({ id }: { id: string }) => (
    <a
      href={`#${id}`}
      className="ml-2 inline-block rounded-full border px-2 py-px align-middle font-mono text-[10px] tracking-[0.12em] opacity-60 transition hover:opacity-100"
      style={{ borderColor: `${c}66`, color: c }}
      title={`Tenet ${id}`}
    >
      {id}
    </a>
  );
  const others = pillars.filter((p) => p.slug !== pillar.slug);

  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <OpenHashDetails />
      {/* Classification strip */}
      <div
        className={`${label} flex items-center justify-between gap-4 border-b px-4 py-2 sm:px-6`}
        style={{ color: c, borderColor: `${c}40`, background: `${c}0d` }}
      >
        <span>Vitaegis // Pillar {pillar.numeral}</span>
        <span className="hidden sm:inline">Eyes only // Need to know</span>
        <span className="hidden sm:inline">{pillar.codename}</span>
        <span className="sm:hidden">Eyes only</span>
      </div>

      <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6">
        <section className="relative flex flex-col items-center py-10 text-center sm:py-14">
          {/* Same shape and spacing as SectionTitle, in the pillar's colour */}
          <header className="mb-10 flex w-full flex-col items-center text-center sm:mb-14">
            <p className={label} style={{ color: c }}>
              Field manual · Pillar {pillar.numeral}
            </p>
            <div className="mt-5 text-5xl opacity-60 sm:text-6xl" style={{ color: c }} aria-hidden>
              {pillar.glyph}
            </div>
            <h1
              className="mt-4 text-4xl font-bold uppercase tracking-[0.18em] sm:text-5xl lg:text-6xl"
              style={{ color: c, textShadow: `0 0 28px ${c}40` }}
            >
              {pillar.name}
            </h1>
            <div
              className="mt-5 h-px w-24 sm:w-32"
              style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
            />
            <p className="mt-5 max-w-2xl text-base font-light italic text-white/80 sm:text-lg">
              “{pillar.doctrine}”
            </p>
            <p className="mt-3 max-w-2xl text-base font-light text-white/60">{pillar.summary}</p>
          </header>

          {/* Prime directives */}
          <section
            className="glass-panel w-full rounded-xl p-6 text-left sm:p-8"
            style={{ borderColor: `${c}40`, boxShadow: `0 0 40px ${c}0d` }}
          >
            <h2 className={`${label} text-center`} style={{ color: c }}>
              Prime directives
            </h2>
            <ol className="mt-6 divide-y" style={{ borderColor: `${c}33` }}>
              {pillar.directives.map((d, i) => (
                <li
                  key={d}
                  id={tenetId(`${L}-00`, i + 1)}
                  className="grid scroll-mt-24 grid-cols-[3rem_1fr] py-3"
                  style={{ borderColor: `${c}33` }}
                >
                  <span className="text-2xl font-light leading-none" style={{ color: c }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-light text-white/85">
                    {d}
                    <Tag id={tenetId(`${L}-00`, i + 1)} />
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Protocol */}
          <section className="mt-8 w-full text-left sm:mt-10">
            <h2 className={label} style={{ color: c }}>
              {pillar.protocolTitle}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-6">
              {pillar.protocol.map((p, i) => (
                <li
                  key={p.k}
                  id={tenetId(`${L}-P`, i + 1)}
                  className="scroll-mt-24 rounded-xl border p-4 sm:p-6"
                  style={{ borderColor: `${c}4d`, background: `${c}0a` }}
                >
                  <p className={label} style={{ color: c }}>
                    {p.k}
                    <Tag id={tenetId(`${L}-P`, i + 1)} />
                  </p>
                  <p className="mt-2 font-light leading-relaxed text-white/80">{p.v}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Dossier index */}
          <nav className="mt-8 flex w-full flex-wrap gap-2 sm:mt-10" aria-label="Files">
            {pillar.dossiers.map((d) => (
              <a
                key={d.code}
                href={`#${d.code}`}
                className="rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-white/10"
                style={{ borderColor: `${c}4d`, color: c }}
              >
                {d.code} · {d.title}
              </a>
            ))}
          </nav>

          {/* Dossiers */}
          <div className="mt-8 flex w-full flex-col gap-4 text-left sm:mt-10 sm:gap-6">
            {pillar.dossiers.map((d, i) => (
              <details
                key={d.code}
                id={d.code}
                open={i === 0}
                className="group scroll-mt-8 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${c}33` }}
              >
                <summary className="flex cursor-pointer list-none items-baseline gap-4 p-4 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <span className={label} style={{ color: c }}>
                    {d.code}
                  </span>
                  <h2 className="flex-1 text-xl font-medium sm:text-2xl">{d.title}</h2>
                  <span
                    className="text-xl transition-transform group-open:rotate-45"
                    style={{ color: c }}
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <p
                    className="border-l-2 pl-4 font-light leading-relaxed text-white/70"
                    style={{ borderColor: c }}
                  >
                    {d.brief}
                  </p>
                  <dl className="mt-4 divide-y" style={{ borderColor: `${c}26` }}>
                    {d.entries.map((e, j) => (
                      <div
                        key={e.k}
                        id={tenetId(d.code, j + 1)}
                        className="grid scroll-mt-24 gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6"
                        style={{ borderColor: `${c}26` }}
                      >
                        <dt className="font-medium" style={{ color: c }}>
                          {e.k}
                          <Tag id={tenetId(d.code, j + 1)} />
                        </dt>
                        <dd className="font-light leading-relaxed text-white/80">{e.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            ))}
          </div>

          {pillar.related.length > 0 && (
            <section className="mt-8 w-full text-left sm:mt-10">
              <h2 className={label} style={{ color: c }}>
                Posts · {pillar.related.length}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-6">
                {pillar.related.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="group rounded-xl border p-4 transition hover:bg-white/[0.04] sm:p-6"
                    style={{ borderColor: `${c}4d` }}
                  >
                    <p className="text-lg font-medium text-white">
                      {r.label}{' '}
                      <span className="transition group-hover:translate-x-0.5" style={{ color: c }}>
                        →
                      </span>
                    </p>
                    {r.blurb && <p className="mt-1 text-sm font-light text-white/60">{r.blurb}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Other pillars */}
          <section className="mt-8 grid w-full gap-4 text-left sm:mt-10 sm:grid-cols-2 sm:gap-6">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/${o.slug}`}
                className="rounded-xl border p-4 transition hover:bg-white/[0.04] sm:p-6"
                style={{ borderColor: `${o.color}4d` }}
              >
                <p className={label} style={{ color: o.color }}>
                  Pillar {o.numeral} · {o.codename}
                </p>
                <p
                  className="mt-2 text-2xl font-bold uppercase tracking-[0.15em]"
                  style={{ color: o.color }}
                >
                  {o.name} →
                </p>
                <p className="mt-2 text-sm font-light text-white/60">{o.summary}</p>
              </Link>
            ))}
          </section>

          <p className="mt-8 text-center text-sm font-light leading-relaxed text-white/45 sm:mt-10">
            {pillar.disclaimer}
          </p>

          <Link
            href="/#practices"
            className={`${label} mt-8 hover:text-white sm:mt-10`}
            style={{ color: c }}
          >
            ← Vitaegis
          </Link>
        </section>
      </div>
    </main>
  );
}
