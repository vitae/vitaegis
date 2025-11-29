'use client';

import React from 'react';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'prominent';
  glow?: boolean;
}

export default function GlassContainer({
  children,
  className = '',
  variant = 'default',
  glow = false,
}: GlassContainerProps) {
  const variants = {
    default: 'bg-black/40 border-white/10',
    subtle: 'bg-black/20 border-white/5',
    prominent: 'bg-black/60 border-vitae-green/20',
  };

  return (
    <div
      className={`
        relative
        backdrop-blur-xl
        rounded-2xl
        border
        ${variants[variant]}
        ${glow ? 'shadow-[0_0_30px_rgba(0,255,65,0.1)]' : ''}
        ${className}
      `}
    >
      {/* Top edge glow */}
      {glow && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
      )}
      {children}
    </div>
  );
}
