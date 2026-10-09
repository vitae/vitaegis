'use client';

import { useEffect, useRef, useState } from 'react';
import GlassButton from '@/components/GlassButton';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import { socials } from '@/components/socials';

export default function CommunitySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');

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
      id="community"
      ref={sectionRef}
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle tagline="Connect with practitioners worldwide. Share your journey, learn from masters, and grow together.">
          Connect
        </SectionTitle>

        {/* Social Links Grid */}
        <div className="mb-8 grid w-full grid-cols-4 gap-3 sm:mb-10 sm:gap-6">
          {socials.map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`VITAEGIS on ${social.name}`}
                className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 group glass-panel glass-panel--hover relative p-4 sm:p-6 rounded-xl text-center"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div className="flex justify-center mb-3">
                  <Icon
                    size={32}
                    className="transition-all duration-300 group-hover:scale-110"
                    style={{ color: social.color }}
                  />
                </div>

                {/* Name */}
                <div className="text-white font-medium mb-1">{social.name}</div>

                {/* Members */}
                <div className="text-sm text-white/50">{social.members} members</div>

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                  style={{
                    boxShadow: `0 0 40px ${social.color}20`,
                  }}
                />
              </a>
            );
          })}
        </div>

        {/* Newsletter Section */}
        <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 w-full">
          <div className="glass-panel glass-panel--prominent relative p-6 sm:p-8 rounded-xl overflow-hidden w-full">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, #00ff00 1px, transparent 0)`,
                  backgroundSize: '32px 32px',
                }}
              />
            </div>

            {/* Top edge glow */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

            <div className="relative grid gap-6 sm:gap-8">
              {/* Left - Text */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Stay <span className="text-vitae-green">Connected</span>
                </h3>
                <p className="text-white/70">Get updates on new intel and events.</p>
              </div>

              {/* Right - Form */}
              <div>
                {/* Field and button: one glass surface, one height, one radius */}
                <div className="flex flex-col gap-4 sm:flex-row">
                  <label className="glass-panel glass-panel--hover flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl px-4 focus-within:border-[#00ff00]/60">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      aria-label="Your email"
                      className="relative z-10 w-full min-w-0 bg-transparent text-center text-base text-white placeholder:text-white/30 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    className="glass-panel glass-panel--hover flex min-h-[52px] shrink-0 items-center justify-center rounded-xl px-5 text-base font-medium tracking-wide text-[#00ff00] transition-colors hover:text-white"
                    style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
                  >
                    <span className="relative z-10">Subscribe</span>
                  </button>
                </div>
                <p className="mt-3 text-xs text-white/40"></p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Stats in Glassmorphic Container */}
        <GlassContainer variant="subtle" padding="lg" className="mt-8 w-full sm:mt-10">
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 grid grid-cols-2 gap-4 text-center sm:gap-6 lg:grid-cols-4">
            {[
              { value: '99K', label: 'Community Members' },
              { value: '120+', label: 'Countries' },
              { value: '1M+', label: 'Practice Sessions' },
              { value: '24/7', label: 'Active Support' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-vitae-green mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>
    </section>
  );
}
