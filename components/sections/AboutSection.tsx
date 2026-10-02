'use client';

import { useEffect, useRef } from 'react';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';

export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => {
                el.classList.add('revealed');
              }, i * 100);
            });
          }
        });
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center pt-8 pb-16 text-center sm:pt-10"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle>About Vitaegis</SectionTitle>
        <div className="w-full max-w-3xl mx-auto">
          {/* Text Content in Glassmorphic Container */}
          <GlassContainer
            variant="default"
            glow={true}
            className="p-3 sm:p-6 lg:p-10 w-full max-w-full"
          >
            {/* Main Heading */}
            <h3 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Advanced Intelligence
              <br />
              <span className="bg-gradient-to-r from-vitae-green to-emerald-400 bg-clip-text text-transparent">
                as a Service
              </span>
            </h3>

            {/* Description */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-6 space-y-4 text-white/70 text-base sm:text-lg leading-relaxed">
              <p>
                Vitaegis is a portmanteau of <em>Vitae</em> and <em>Aegis</em>: Life Energy.
              </p>
              <p>
                We run it as an intelligence layer. Intelligence orchestrated agentically over
                curated knowledge, served through streaming APIs on serverless infrastructure.
                Turning ideas into reality, in real time.
              </p>
            </div>

            {/* CTA Link */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8">
              <button className="group inline-flex items-center gap-2 text-vitae-green font-medium tracking-[0.2em] hover:gap-4 transition-all duration-300">
                LEARN OUR SECRETS
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </div>
          </GlassContainer>
        </div>

        {/* Vitality */}
        <div className="w-full max-w-3xl mx-auto mt-10">
          <GlassContainer
            variant="default"
            glow={true}
            className="p-3 sm:p-6 lg:p-10 w-full max-w-full"
          >
            {/* Header: eight letters each, one grid, so every letter sits over its partner. */}
            <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mx-auto w-full max-w-md">
              <svg
                viewBox="0 0 640 236"
                className="block h-auto w-full"
                role="img"
                aria-label="Vitaegis Vitality"
              >
                {(['VITAEGIS', 'VITALITY'] as const).map((word, row) =>
                  word.split('').map((ch, i) => (
                    <text
                      key={`${word}-${i}`}
                      x={i * 80 + 40}
                      y={row === 0 ? 100 : 216}
                      textAnchor="middle"
                      fontFamily="Jost, 'Century Gothic', sans-serif"
                      fontWeight={700}
                      fontSize="104"
                      fill={row === 0 ? '#FFFFFF' : '#00FF00'}
                    >
                      {ch}
                    </text>
                  )),
                )}
              </svg>
            </h2>

            {/* Definition */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8 text-left mx-auto max-w-xl">
              <p className="text-white text-xl sm:text-2xl font-medium">
                vi·tal·i·ty <span className="text-white/50 text-base font-normal">/vīˈtalədē/</span>{' '}
                <span className="text-white/50 text-base font-normal italic">noun</span>
              </p>
              <ol className="mt-3 space-y-2 text-white/70 text-base sm:text-lg leading-relaxed list-decimal list-inside">
                <li>The state of being strong and active. Energy.</li>
                <li>The power giving continuance of life, present in all living things.</li>
              </ol>
              <p className="mt-3 text-white/50 text-sm">
                From the Latin <em>vitalis</em>, of life. The same root as <em>Vitae</em>.
              </p>
            </div>

            {/* How */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8 space-y-4 text-white/70 text-base sm:text-lg leading-relaxed">
              <p>
                Vitality is the one asset every other one depends on, and the one that cannot be
                bought back. So we point the most advanced technology we have at it.
              </p>
              <p>
                Intelligence agents read the research, the oracles and the markets around the clock,
                and turn what they learn into protocols you can act on: what to eat, when to sleep,
                how to move, where to put your energy and your money. Streaming AI answers in real
                time, grounded in curated knowledge rather than guesswork. Live data from the chain,
                the markets and your own practice, so the picture is always current. Content,
                products and tools that carry the same discipline into your day.
              </p>
              <p className="text-vitae-green">
                Ancient practice for the body. Cyber technology for the mind. Vitality is what they
                build together.
              </p>
            </div>
          </GlassContainer>
        </div>

        {/* Bottom decorative line */}
        <div className="reveal opacity-0 transition-all duration-1000 [&.revealed]:opacity-100 mt-20 flex items-center justify-center">
          <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}
