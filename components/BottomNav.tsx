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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Safe area padding for notched devices */}
      <div className="px-2 pb-2 pt-1 bg-gradient-to-t from-black/50 to-transparent">
        {/* Glassmorphic container */}
        <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl">
          {/* Top edge glow */}
          <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
          
          {/* Nav items */}
          <div className="flex items-center justify-around px-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`
                    relative flex flex-col items-center justify-center
                    flex-1 max-w-[72px] px-1 py-2 rounded-xl
                    transition-all duration-300 ease-out
                    active:scale-95
                    ${isActive 
                      ? 'text-vitae-green' 
                      : 'text-white/50 hover:text-white/80'
                    }
                  `}
                >
                  {/* Active background glow */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-vitae-green/10" />
                  )}
                  
                  {/* Ripple effect */}
                  {ripple === item.id && (
                    <div className="absolute inset-0 animate-ping rounded-xl bg-vitae-green/20" />
                  )}
                  
                  {/* Icon */}
                  <div className="relative">
                    <Icon 
                      size={22} 
                      className={`
                        transition-all duration-300
                        ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]' : 'scale-100'}
                      `}
                    />
                  </div>
                  
                  {/* Label */}
                  <span 
                    className={`
                      mt-0.5 text-[9px] xs:text-[10px] font-medium tracking-wide
                      transition-all duration-300
                      ${isActive ? 'opacity-100' : 'opacity-70'}
                    `}
                  >
                    {item.label}
                  </span>

                  {/* Active dot indicator */}
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-vitae-green shadow-[0_0_8px_#00ff00]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Ambient glow under the nav */}
      <div className="absolute bottom-0 left-1/2 h-16 w-2/3 -translate-x-1/2 -z-10 bg-vitae-green/5 blur-2xl rounded-full pointer-events-none" />
    </nav>
  );
}
