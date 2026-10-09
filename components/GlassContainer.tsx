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
  // One padding scale for every card on the site: 12/16, 16/24, 24/32px
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantClasses = {
    default: 'glass-panel',
    subtle: 'glass-panel glass-panel--subtle',
    prominent: 'glass-panel glass-panel--prominent',
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${className}
      `}
      style={style}
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
            background:
              'radial-gradient(ellipse at top, rgba(0, 255, 65, 0.05) 0%, transparent 50%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
