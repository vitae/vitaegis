'use client';

import { useState } from 'react';
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

interface BottomNavProps {
  activeSection?: string;
  onNavigate?: (id: string) => void;
}

export default function BottomNav({ activeSection = 'hero', onNavigate }: BottomNavProps) {
  const [ripple, setRipple] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setRipple(id);
    setTimeout(() => setRipple(null), 300);
    
    if (onNavigate) {
      onNavigate(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 sm:px-4 sm:pb-4">
      {/* Glassmorphic container */}
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl">
        {/* Top edge glow */}
        <div className="absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
        
        {/* Nav items */}
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`
                  relative flex flex-col items-center justify-center
                  min-w-[56px] px-3 py-2 rounded-xl
                  transition-all duration-300 ease-out
                  ${isActive 
                    ? 'text-vitae-green' 
                    : 'text-white/50 hover:text-white/80'
                  }
                `}
              >
                {/* Active background glow */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-vitae-green/10 shadow-[0_0_20px_rgba(0,255,65,0.2)]" />
                )}
                
                {/* Ripple effect */}
                {ripple === item.id && (
                  <div className="absolute inset-0 animate-ping rounded-xl bg-vitae-green/20" />
                )}
                
                {/* Icon */}
                <div className="relative">
                  <Icon 
                    size={24} 
                    className={`
                      transition-transform duration-300
                      ${isActive ? 'scale-110' : 'scale-100'}
                    `}
                  />
                  
                  {/* Active dot indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-vitae-green shadow-[0_0_8px_#00ff00]" />
                  )}
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    mt-1 text-[10px] font-medium tracking-wider
                    transition-all duration-300
                    ${isActive ? 'opacity-100' : 'opacity-60'}
                  `}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Bottom safe area for devices with home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </div>
      
      {/* Ambient glow under the nav */}
      <div className="absolute bottom-0 left-1/2 h-20 w-3/4 -translate-x-1/2 -z-10 bg-vitae-green/5 blur-3xl rounded-full" />
    </nav>
  );
}
