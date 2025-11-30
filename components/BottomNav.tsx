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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glassmorphic container */}
      <div className="relative mx-2 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl">
        {/* Top edge glow */}
        <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
        
        {/* Nav items */}
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`
                  relative flex flex-col items-center justify-center
                  flex-1 py-3 min-h-[56px]
                  transition-all duration-200 ease-out
                  active:scale-95 active:opacity-80
                  ${isActive 
                    ? 'text-vitae-green' 
                    : 'text-white/50'
                  }
                `}
              >
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-x-2 inset-y-1 rounded-xl bg-vitae-green/10" />
                )}
                
                {/* Ripple effect */}
                {ripple === item.id && (
                  <div className="absolute inset-2 animate-ping rounded-xl bg-vitae-green/20" />
                )}
                
                {/* Icon */}
                <div className="relative z-10">
                  <Icon 
                    size={22} 
                    className={`
                      transition-transform duration-200
                      ${isActive ? 'scale-110' : 'scale-100'}
                    `}
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    relative z-10 mt-1 text-[10px] font-medium tracking-wider
                    transition-opacity duration-200
                    ${isActive ? 'opacity-100' : 'opacity-70'}
                  `}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 h-12 w-1/2 -translate-x-1/2 -z-10 bg-vitae-green/5 blur-2xl rounded-full pointer-events-none" />
    </nav>
  );
}
