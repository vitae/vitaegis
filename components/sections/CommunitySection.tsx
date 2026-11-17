'use client';

import { useState } from 'react';
import SectionTitle from '@/components/SectionTitle';
import { socials } from '@/components/socials';

export default function CommunitySection() {
  const [email, setEmail] = useState('');
  const [subscribeState, setSubscribeState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [subscribeNote, setSubscribeNote] = useState('');

  async function subscribe() {
    if (subscribeState === 'busy') return;
    setSubscribeState('busy');
    setSubscribeNote('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'home' }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save that. Try again.');
      setSubscribeState('done');
      setSubscribeNote("You're in.");
      setEmail('');
    } catch (err) {
      setSubscribeState('error');
      setSubscribeNote(err instanceof Error ? err.message : 'Could not save that. Try again.');
    }
  }

  return (
    <section
      id="community"
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div
        className="section-container flex flex-col items-center justify-center mx-auto"
        style={{ width: '100%' }}
      >
        <SectionTitle tagline="Connect globally and share your journey.">Connect</SectionTitle>

        {/* Social Links Grid */}
        <div className="mb-8 grid w-full grid-cols-4 gap-3 sm:mb-10 sm:gap-6 lg:grid-cols-8 lg:gap-4">
          {socials.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`VITAEGIS on ${social.name}`}
                className="reveal group glass-panel glass-panel--lit glass-panel--hover relative min-w-0 px-1 py-4 sm:p-6 rounded-xl text-center"
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
                <div className="text-xs leading-tight text-white font-medium sm:text-sm lg:text-base">
                  {social.name}
                </div>

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
        <div className="reveal w-full">
          <div className="glass-panel glass-panel--lit relative p-6 sm:p-8 rounded-xl overflow-hidden w-full">
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

            <div className="relative flex flex-col items-center gap-5 text-center">
              <h3 className="text-2xl font-bold leading-none text-white sm:text-3xl">
                Stay <span className="text-vitae-green">Connected</span>
              </h3>
              <p className="leading-none text-white/70">Get updates on new intel and events.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  subscribe();
                }}
                className="flex w-full max-w-md flex-col items-center gap-5"
              >
                <label className="glass-panel glass-panel--lit glass-panel--hover flex min-h-[52px] w-full min-w-0 items-center justify-center rounded-xl px-4 focus-within:border-[#00ff00]/60">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your Email"
                    aria-label="Your email"
                    className="relative z-10 m-0 w-full min-w-0 bg-transparent p-0 text-center text-base text-white placeholder:text-white/30 outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={subscribeState === 'busy'}
                  className="glass-panel glass-panel--lit glass-panel--hover flex min-h-[52px] w-full items-center justify-center rounded-xl px-8 text-base font-medium tracking-wide text-[#00ff00] transition-colors hover:text-white disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
                  style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
                >
                  <span className="relative z-10">
                    {subscribeState === 'busy'
                      ? 'Sending…'
                      : subscribeState === 'done'
                        ? "You're in"
                        : 'Subscribe'}
                  </span>
                </button>
              </form>
              <p
                className={`text-xs empty:hidden ${subscribeState === 'error' ? 'text-vitae-red' : 'text-vitae-green'}`}
                aria-live="polite"
              >
                {subscribeNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
