'use client';

import { useState, useEffect } from 'react';
import { HiMenuAlt4, HiX } from 'react-icons/hi';
import { ConnectWalletButton } from '@/components/GlassButton';

interface Section {
  id: string;
  label: string;
}

interface GlassNavProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (id: string) => void;
}

export default function GlassNav({ sections, activeSection, onNavigate }: GlassNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when navigating
  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`relative flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500 ${
              isScrolled
                ? 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                : 'bg-transparent'
            }`}
          >
            {/* Logo */}
            <button
              onClick={() => handleNavigate('hero')}
              className="group flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center group-hover:border-vitae-green transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                  <span className="text-vitae-green font-bold text-lg">V</span>
                </div>
                <div className="absolute -inset-1 bg-vitae-green/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-xl font-semibold tracking-wider hidden sm:block">
                VITAEGIS
              </span>
            </button>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleNavigate(section.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeSection === section.id
                      ? 'text-vitae-green'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {section.label}
                  {activeSection === section.id && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-vitae-green rounded-full shadow-[0_0_10px_#00ff00]" />
                  )}
                </button>
              ))}
            </div>

            {/* Connect Button - Desktop */}
            <div className="hidden md:block">
              <ConnectWalletButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-300"
              aria-label="Toggle menu"
            >
              {isOpen ? <HiX size={20} /> : <HiMenuAlt4 size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
          isOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-20 left-4 right-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 transition-all duration-500 ${
            isOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          {/* Decorative glow */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-vitae-green to-transparent" />

          <div className="space-y-2">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => handleNavigate(section.id)}
                className={`w-full text-left px-4 py-4 rounded-2xl text-lg font-medium transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-vitae-green/10 text-vitae-green border border-vitae-green/30'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="flex items-center justify-between">
                  {section.label}
                  {activeSection === section.id && (
                    <span className="w-2 h-2 bg-vitae-green rounded-full shadow-[0_0_10px_#00ff00]" />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Mobile Connect Button */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <ConnectWalletButton className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
}
