'use client';

import { useState, useCallback, useRef } from 'react';
import { HiHome, HiInformationCircle, HiVideoCamera, HiShoppingBag, HiUserGroup } from 'react-icons/hi';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - BottomNav Component
   Instagram-Level Tab Bar with Physics Animations
   ═══════════════════════════════════════════════════════════════════════════════ */

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

// Navigation items - matching Instagram's 5-tab structure
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
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const lastTapRef = useRef<number>(0);

  // Handle touch with haptic-like visual feedback
  const handleTouchStart = useCallback((id: string) => {
    setPressedId(id);
  }, []);

  const handleTouchEnd = useCallback((id: string) => {
    setPressedId(null);
    
    // Prevent double-tap
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;

    // Trigger bounce animation
    setBounceId(id);
    setTimeout(() => setBounceId(null), 300);

    // Navigate
    if (onNavigate) {
      onNavigate(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [onNavigate]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Glass container with safe area */}
      <div 
        className="glass-nav separator-top"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Tab items container */}
        <div className="flex items-stretch h-[49px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isPressed = pressedId === item.id;
            const isBouncing = bounceId === item.id;

            return (
              <button
                key={item.id}
                onTouchStart={() => handleTouchStart(item.id)}
                onTouchEnd={() => handleTouchEnd(item.id)}
                onMouseDown={() => handleTouchStart(item.id)}
                onMouseUp={() => handleTouchEnd(item.id)}
                onMouseLeave={() => setPressedId(null)}
                className="tab-item"
                style={{
                  transform: isPressed 
                    ? 'scale(0.85) translateZ(0)' 
                    : isBouncing 
                      ? 'scale(1.1) translateZ(0)' 
                      : 'scale(1) translateZ(0)',
                  transition: isPressed 
                    ? 'transform 0.1s ease-out' 
                    : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon - wrapped in span for glow effect */}
                <span
                  className={`
                    transition-all duration-200
                    ${isActive ? 'text-vitae-green' : 'text-white/60'}
                  `}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.5))' : 'none',
                  }}
                >
                  <Icon size={24} />
                </span>
                
                {/* Label - Instagram style: 10px, medium weight */}
                <span 
                  className={`
                    mt-[2px] text-[10px] font-medium tracking-wide
                    transition-colors duration-200
                    ${isActive ? 'text-vitae-green' : 'text-white/50'}
                  `}
                >
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div 
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vitae-green"
                    style={{
                      boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ambient underglow */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 255, 65, 0.1) 0%, transparent 70%)',
        }}
      />
    </nav>
  );
}
