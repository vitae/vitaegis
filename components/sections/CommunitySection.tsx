'use client';

import { useEffect, useRef, useState } from 'react';
import { FaDiscord, FaTwitter, FaTelegram, FaGithub, FaYoutube, FaMedium } from 'react-icons/fa';

const socials = [
  { name: 'Discord', icon: FaDiscord, href: '#', members: '12.5K', color: '#5865F2' },
  { name: 'Twitter', icon: FaTwitter, href: '#', members: '45K', color: '#1DA1F2' },
  { name: 'Telegram', icon: FaTelegram, href: '#', members: '8.2K', color: '#0088cc' },
  { name: 'GitHub', icon: FaGithub, href: '#', members: '2.1K', color: '#ffffff' },
  { name: 'YouTube', icon: FaYoutube, href: '#', members: '15K', color: '#FF0000' },
  { name: 'Medium', icon: FaMedium, href: '#', members: '5.8K', color: '#ffffff' },
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
      className="relative min-h-screen py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
            <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
              Join the Movement
            </span>
          </div>

          <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold">
            Our <span className="text-vitae-green">Community</span>
          </h2>

          <p className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
            Connect with practitioners worldwide. Share your journey, learn from masters,
            and grow together in our vibrant ecosystem.
          </p>
        </div>

        {/* Social Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {socials.map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 group relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 text-center"
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
        <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
          <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-vitae-green/10 to-transparent border border-vitae-green/20 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, #00ff41 1px, transparent 0)`,
                  backgroundSize: '32px 32px',
                }}
              />
            </div>

            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              {/* Left - Text */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Stay in the <span className="text-vitae-green">Loop</span>
                </h3>
                <p className="text-white/70">
                  Get weekly insights on practice techniques, token updates, and exclusive
                  community events. No spam, just value.
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
                      placeholder="Enter your email"
                      className="w-full px-6 py-4 rounded-2xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-vitae-green/50 transition-colors"
                    />
                  </div>
                  <button className="px-8 py-4 rounded-2xl bg-vitae-green text-black font-semibold hover:bg-vitae-green/90 transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:shadow-[0_0_30px_rgba(0,255,65,0.4)]">
                    Subscribe
                  </button>
                </div>
                <p className="mt-3 text-xs text-white/40">
                  By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {[
            { value: '50K+', label: 'Community Members' },
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
      </div>
    </section>
  );
}
