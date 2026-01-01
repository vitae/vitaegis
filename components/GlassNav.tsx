'use client';

import { useState, useEffect } from 'react';
import { HiHome, HiInformationCircle, HiVideoCamera, HiShoppingBag, HiUserGroup } from 'react-icons/hi';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
  { id: 'hero', label: 'HOME', icon: HiHome },
  { id: 'about', label: 'ABOUT', icon: HiInformationCircle },
  { id: 'practices', label: 'LIVE', icon: HiVideoCamera },
  { id: 'token', label: 'STORE', icon: HiShoppingBag },
  { id: 'community', label: 'CONNECT', icon: HiUserGroup },
];

interface GlassNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export default function GlassNav({ activeSection, onNavigate }: GlassNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (id: string) => {
    onNavigate(id);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'py-2' : 'py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`relative flex items-center justify-between px-4 lg:px-6 py-2 lg:py-3 rounded-2xl transition-all duration-500 ${
            isScrolled
              ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
              : 'bg-black/20 backdrop-blur-lg border border-white/5'
          }`}
        >
          {/* Top edge glow */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

          {/* Logo */}
          <button
            onClick={() => handleNavigate('hero')}
            className="group flex items-center gap-2 lg:gap-3"
          >
            <div className="relative">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center group-hover:border-vitae-green transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <span className="text-vitae-green font-bold text-base lg:text-lg">V</span>
              </div>
              <div className="absolute -inset-1 bg-vitae-green/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg lg:text-xl font-semibold tracking-wider hidden lg:block">
              VITAEGIS
            </span>
          </button>

          {/* Desktop Links with Icons */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-vitae-green bg-vitae-green/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-vitae-green' : ''} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-vitae-green rounded-full shadow-[0_0_10px_#00ff00]" />
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
}   

