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
      className="relative flex min-h-screen flex-col items-center pt-8 pb-16 text-center sm:pt-10"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle tagline="Connect with practitioners worldwide. Share your journey, learn from masters, and grow together.">
          Connect
        </SectionTitle>

        {/* Social Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 w-full max-w-full">
          {socials.map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`VITAEGIS on ${social.name}`}
                className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 group glass-panel glass-panel--hover relative p-3 sm:p-6 rounded-2xl text-center"
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
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
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
          <div className="glass-panel glass-panel--prominent relative p-4 sm:p-12 rounded-3xl overflow-hidden w-full">
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

            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              {/* Left - Text */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Stay <span className="text-vitae-green">Connected</span>
                </h3>
                <p className="text-white/70">
                  Get weekly insights on practice techniques, skill updates, community events.
                </p>
              </div>

              {/* Right - Form */}
              <div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter"
                      className="glass-panel glass-panel--subtle w-full px-6 py-4 rounded-2xl text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50"
                    />
                  </div>
                  <GlassButton variant="primary" size="lg">
                    Subscribe
                  </GlassButton>
                </div>
                <p className="mt-3 text-xs text-white/40"></p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Stats in Glassmorphic Container */}
        <GlassContainer variant="subtle" className="mt-12 p-4 sm:p-8 w-full">
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
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
