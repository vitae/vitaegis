'use client';

import { useEffect, useRef, useState } from 'react';
import { FaDiscord, FaTwitter, FaTelegram, FaGithub, FaYoutube, FaTwitch, FaInstagram, FaFacebook } from 'react-icons/fa';
import GlassButton from '@/components/GlassButton';
import GlassContainer from '@/components/GlassContainer';

const socials = [
  { name: 'Facebook', icon: FaFacebook, href: '#', members: '1M', color: '#00ff00' },
  { name: 'Instagram', icon: FaInstagram, href: '#', members: '5M', color: '#00ff00' },
  { name: 'YouTube', icon: FaYoutube, href: '#', members: '3M', color: '#FF0000' },
  { name: 'Twitter', icon: FaTwitter, href: '#', members: '2.5M', color: '#00ff00' },
  { name: 'Twitch', icon: FaTwitch, href: '#', members: '5.8K', color: '#ff00ff' },
   { name: 'Discord', icon: FaDiscord, href: '#', members: '20K', color: '#7289DA' },
];

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
      { threshold: 0.2 }
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
      className="relative min-h-screen flex flex-col items-center justify-center text-center"
    >
      <div className="section-container flex flex-col items-center justify-center mx-auto" style={{ width: '100%' }}>
        {/* Section Header in Glassmorphic Container */}
        <GlassContainer variant="default" glow={true} className="text-center mb-12 sm:mb-20 p-4 sm:p-8 w-full max-w-3xl mx-auto">
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
            <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
              Join the Movement
            </span>
          </div>

          <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">
            Our <span className="text-vitae-green">Community</span>
          </h2>

          <p className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Connect with practitioners worldwide. Share your journey, learn from masters,
            and grow together in our vibrant ecosystem.
          </p>
        </GlassContainer>

        {/* Social Links Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-12 w-full max-w-full">
          {socials.map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 group relative p-3 sm:p-6 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 hover:bg-black/25 hover:border-white/20 text-center"
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
          <div className="relative p-4 sm:p-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-vitae-green/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,65,0.1)] w-full">
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
                  Get weekly insights on practice techniques, skill updates, andcommunity events.
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
                      className="w-full px-6 py-4 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 transition-colors"
                    />
                  </div>
                  <GlassButton variant="primary" size="lg">
                    Subscribe
                  </GlassButton>
                </div>
                <p className="mt-3 text-xs text-white/40">
                </p>
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
