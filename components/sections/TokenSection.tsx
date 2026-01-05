'use client';

import { useEffect, useRef, useState } from 'react';
import { HiSwitchVertical, HiCog, HiInformationCircle } from 'react-icons/hi';
import { SiEthereum } from 'react-icons/si';
import { ConnectWalletButton } from '@/components/GlassButton';
import GlassContainer from '@/components/GlassContainer';

export default function TokenSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [fromAmount, setFromAmount] = useState('1.0');
  const [toAmount, setToAmount] = useState('42,000');

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
      id="token"
      ref={sectionRef}
      className="relative min-h-screen py-24 sm:py-32 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-stretch w-full justify-center text-center justify-center">
          {/* Left Column - Token Info in Glassmorphic Container */}
          <GlassContainer variant="default" glow={true} className="w-full h-full min-h-[400px] flex flex-col justify-between">
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0">
              <span className="text-vitae-green text-sm font-medium tracking-[0.3em] uppercase">
                $VITCOIN
              </span>
            </div>

            <h2 className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              CHANGE YOUR{' '}
              <span className="text-vitae-green">LIFE</span>
            </h2>

            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-6 space-y-4 text-white/70 text-base sm:text-lg leading-relaxed">
              <p>
                VITCOIN powers the entire blockchain ecosystem. Earn through stake for passive rewards, and unlock premium 
                content and access to exclusive community events. 
              </p>
            </div>

            {/* Token Stats */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Total Supply', value: '100M' },
                { label: 'Circulating', value: '42M' },
                { label: 'Staking APY', value: '12.5%' },
                { label: 'Holders', value: '8,420' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-2xl bg-black/15 backdrop-blur-sm border border-white/10"
                >
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Contract Address */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 mt-6">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span>Contract:</span>
                <code className="px-3 py-1 rounded-lg bg-black/15 text-vitae-green font-mono text-xs">
                  0x1234...1337
                </code>
                <button className="text-white/50 hover:text-vitae-green transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </GlassContainer>

          {/* Right Column - Swap Interface */}
          <div className="reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0 w-full h-full min-h-[400px] flex flex-col justify-between">
            <div className="relative p-6 sm:p-8 rounded-3xl bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_rgba(0,255,65,0.1)] h-full flex flex-col justify-between">
              {/* Decorative glow */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Swap</h3>
                <button className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-all">
                  <HiCog size={20} />
                </button>
              </div>

              {/* From Input */}
              <div className="p-4 rounded-2xl bg-black/15 backdrop-blur-sm border border-white/5 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/50">From</span>
                  <span className="text-sm text-white/50">Balance: 2.45</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl sm:text-3xl font-semibold text-white outline-none"
                    placeholder="0.0"
                  />
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <SiEthereum className="text-[#627eea]" size={20} />
                    <span className="font-medium">ETH</span>
                    <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-3 relative z-10">
                <button className="p-3 rounded-xl bg-black border border-white/10 text-vitae-green hover:bg-vitae-green/10 hover:border-vitae-green/30 transition-all">
                  <HiSwitchVertical size={20} />
                </button>
              </div>

              {/* To Input */}
              <div className="p-4 rounded-2xl bg-black/15 backdrop-blur-sm border border-white/5 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/50">To</span>
                  <span className="text-sm text-white/50">Balance: 1,300,000</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={toAmount}
                    readOnly
                    className="flex-1 bg-transparent text-2xl sm:text-3xl font-semibold text-white outline-none"
                    placeholder="0.0"
                  />
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vitae-green/10 border border-vitae-green/30 hover:bg-vitae-green/20 transition-all">
                    <div className="w-5 h-5 rounded-full bg-vitae-green flex items-center justify-center text-black text-xs font-bold">
                      V
                    </div>
                    <span className="font-medium text-vitae-green">VIT</span>
                    <svg className="w-4 h-4 text-vitae-green/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="flex items-center justify-between mt-4 px-2 text-sm text-white/50">
                <div className="flex items-center gap-1">
                  <HiInformationCircle size={16} />
                  <span>1 ETH = 1 VIT</span>
                </div>
                <span>~$3,450</span>
              </div>

              {/* Swap Button */}
              <ConnectWalletButton className="w-full mt-6" />

              {/* Powered by */}
              <div className="mt-4 text-center text-xs text-white/30">
                Powered by VITAEGIS V3
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
