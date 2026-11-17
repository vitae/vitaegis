import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';

export default function AboutSection() {
  return (
    <section id="about" className="relative flex flex-col items-center py-10 text-center sm:py-14">
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
            <p>
              VITAEGIS is a portmanteau of the words VITAE, LIFE and AEGIS, FORCE which represents
              the life force energy of all things and how we can access infinite intelligence.
            </p>
            <p>We offer advanced intelligence as a service.</p>
            <p className="font-medium uppercase tracking-[0.2em] text-vitae-green">
              Enter our evolution
            </p>
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
