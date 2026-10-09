import Link from 'next/link';
import OpenHashDetails from '@/components/OpenHashDetails';
import { pillars, type Pillar } from '@/lib/pillars';

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em]';

export default function PillarDossier({ pillar }: { pillar: Pillar }) {
  const c = pillar.color;
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

      <div className="mx-auto max-w-4xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/#practices" className={`${label} hover:text-white`} style={{ color: c }}>
          ← Vitaegis
        </Link>

        <header className="py-16 text-center">
          <p className={label} style={{ color: c }}>
            Field manual · Pillar {pillar.numeral}
          </p>
          <div className="mt-6 text-6xl opacity-60 sm:text-7xl" style={{ color: c }} aria-hidden>
            {pillar.glyph}
          </div>
          <h1
            className="mt-4 text-5xl font-bold uppercase tracking-[0.18em] sm:text-7xl"
            style={{ color: c, textShadow: `0 0 24px ${c}73` }}
          >
            {pillar.name}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light italic text-white/80">
            “{pillar.doctrine}”
          </p>
          <p className="mx-auto mt-4 max-w-2xl font-light text-white/60">{pillar.summary}</p>
        </header>

        {/* Prime directives */}
        <section
          className="rounded-2xl border bg-white/[0.03] p-6 backdrop-blur-lg sm:p-10"
          style={{ borderColor: `${c}40`, boxShadow: `0 0 40px ${c}0d` }}
        >
          <h2 className={`${label} text-center`} style={{ color: c }}>
            Prime directives
          </h2>
          <ol className="mt-6 divide-y" style={{ borderColor: `${c}33` }}>
            {pillar.directives.map((d, i) => (
              <li
                key={d}
                className="grid grid-cols-[3rem_1fr] py-3"
                style={{ borderColor: `${c}33` }}
              >
                <span className="text-2xl font-light leading-none" style={{ color: c }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-light text-white/85">{d}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Protocol */}
        <section className="mt-12">
          <h2 className={label} style={{ color: c }}>
            {pillar.protocolTitle}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {pillar.protocol.map((p) => (
              <li
                key={p.k}
                className="rounded-xl border p-5"
                style={{ borderColor: `${c}4d`, background: `${c}0a` }}
              >
                <p className={label} style={{ color: c }}>
                  {p.k}
                </p>
                <p className="mt-2 font-light leading-relaxed text-white/80">{p.v}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Dossier index */}
        <nav className="mt-12 flex flex-wrap gap-2" aria-label="Files">
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
        <div className="mt-8 space-y-4">
          {pillar.dossiers.map((d, i) => (
            <details
              key={d.code}
              id={d.code}
              open={i === 0}
              className="group scroll-mt-8 rounded-2xl border bg-white/[0.02]"
              style={{ borderColor: `${c}33` }}
            >
              <summary className="flex cursor-pointer list-none items-baseline gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
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
              <div className="px-5 pb-6 sm:px-6">
                <p
                  className="border-l-2 pl-4 font-light leading-relaxed text-white/70"
                  style={{ borderColor: c }}
                >
                  {d.brief}
                </p>
                <dl className="mt-4 divide-y" style={{ borderColor: `${c}26` }}>
                  {d.entries.map((e) => (
                    <div
                      key={e.k}
                      className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6"
                      style={{ borderColor: `${c}26` }}
                    >
                      <dt className="font-medium" style={{ color: c }}>
                        {e.k}
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
          <section className="mt-12">
            <h2 className={label} style={{ color: c }}>
              Posts · {pillar.related.length}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {pillar.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group rounded-2xl border p-5 transition hover:bg-white/[0.04]"
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
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/${o.slug}`}
              className="rounded-2xl border p-6 transition hover:bg-white/[0.04]"
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

        <p className="mt-12 text-center text-sm font-light leading-relaxed text-white/45">
          {pillar.disclaimer}
        </p>
      </div>
    </main>
  );
}
