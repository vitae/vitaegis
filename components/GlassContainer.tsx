'use client';

import { ReactNode, CSSProperties } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - GlassContainer Component
   Glassmorphic Card with Instagram Spacing System
   ═══════════════════════════════════════════════════════════════════════════════ */

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'prominent';
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

export default function GlassContainer({
  children,
  className = '',
  variant = 'default',
  glow = false,
  padding = 'md',
  style,
}: GlassContainerProps) {
  // Instagram spacing: 4, 8, 12, 16px
  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-3', // 8px, 12px
    md: 'p-3 sm:p-4', // 12px, 16px
    lg: 'p-4 sm:p-6', // 16px, 24px
  };

  const variantClasses = {
    default: 'bg-black/20 border-white/[0.15]',
    subtle: 'bg-black/10 border-white/[0.08]',
    prominent: 'bg-black/30 border-vitae-green/20',
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        backdrop-blur-xl
        border
        transition-all duration-300 ease-out
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${className}
      `}
      style={{
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        width: '100%',
        maxWidth: '100%',
        ...style,
      }}
    >
      {/* Top edge glow effect */}
      {glow && (
        <div 
          className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.5), transparent)',
          }}
        />
      )}
      
      {/* Inner glow for prominent variant */}
      {variant === 'prominent' && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(0, 255, 65, 0.05) 0%, transparent 50%)',
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
