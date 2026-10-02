/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Section title
   The one heading every home-page section opens with, so ABOUT VITAEGIS, LIVE,
   PROJECTS, STORE and CONNECT all land the same way when their nav item is tapped.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  children: string;
  /** One line under the title, optional. */
  tagline?: string;
}

export default function SectionTitle({ children, tagline }: Props) {
  return (
    <header className="mb-10 flex w-full flex-col items-center text-center sm:mb-14">
      <h2
        className="text-4xl font-bold uppercase tracking-[0.18em] text-white sm:text-5xl lg:text-6xl"
        style={{ textShadow: '0 0 28px rgba(0,255,0,0.25)' }}
      >
        {children}
      </h2>
      <div
        className="mt-5 h-px w-24 sm:w-32"
        style={{ background: 'linear-gradient(90deg, transparent, #00ff00, transparent)' }}
      />
      {tagline && (
        <p className="mt-5 max-w-2xl text-base font-light text-white/70 sm:text-lg">{tagline}</p>
      )}
    </header>
  );
}
