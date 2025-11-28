'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      glow = true,
      children,
      icon,
      iconPosition = 'right',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative overflow-hidden
      font-medium tracking-wide
      rounded-2xl
      transition-all duration-300 ease-out
      flex items-center justify-center gap-2
      backdrop-blur-xl
      border
      group
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantStyles = {
      primary: `
        bg-gradient-to-br from-[#00ff00]/20 via-[#00ff00]/10 to-transparent
        border-[#00ff00]/50
        text-[#00ff00]
        hover:from-[#00ff00]/30 hover:via-[#00ff00]/20 hover:to-[#00ff00]/10
        hover:border-[#00ff00]/80
        hover:text-white
        ${glow ? 'hover:shadow-[0_0_30px_rgba(0,255,0,0.4),inset_0_0_20px_rgba(0,255,0,0.1)]' : ''}
        active:scale-[0.98]
      `,
      secondary: `
        bg-gradient-to-br from-white/10 via-white/5 to-transparent
        border-white/20
        text-white
        hover:from-white/15 hover:via-white/10 hover:to-white/5
        hover:border-white/40
        ${glow ? 'hover:shadow-[0_0_20px_rgba(255,255,255,0.1),inset_0_0_15px_rgba(255,255,255,0.05)]' : ''}
        active:scale-[0.98]
      `,
      ghost: `
        bg-transparent
        border-transparent
        text-white/70
        hover:bg-white/5
        hover:text-[#00ff00]
        hover:border-[#00ff00]/30
        active:scale-[0.98]
      `,
      outline: `
        bg-transparent
        border-[#00ff00]/30
        text-[#00ff00]
        hover:bg-[#00ff00]/10
        hover:border-[#00ff00]/60
        ${glow ? 'hover:shadow-[0_0_25px_rgba(0,255,0,0.3)]' : ''}
        active:scale-[0.98]
      `,
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {/* Inner glow layer */}
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-transparent via-[#00ff00]/5 to-[#00ff00]/10" />
        
        {/* Shine effect on hover */}
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </span>

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {icon && iconPosition === 'left' && (
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              {icon}
            </span>
          )}
        </span>

        {/* Bottom highlight */}
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-[#00ff00]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export default GlassButton;

// ═══════════════════════════════════════════════════════════════════════════════
// ICON BUTTON VARIANT
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: ReactNode;
}

export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ size = 'md', glow = true, children, className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`
          relative overflow-hidden
          rounded-xl
          bg-gradient-to-br from-white/10 via-white/5 to-transparent
          backdrop-blur-xl
          border border-white/20
          text-white/70
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:border-[#00ff00]/50
          hover:text-[#00ff00]
          hover:from-[#00ff00]/15 hover:via-[#00ff00]/10 hover:to-transparent
          ${glow ? 'hover:shadow-[0_0_20px_rgba(0,255,0,0.3)]' : ''}
          active:scale-95
          group
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
          {children}
        </span>
      </button>
    );
  }
);

GlassIconButton.displayName = 'GlassIconButton';

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT WALLET BUTTON (Special Variant)
// ═══════════════════════════════════════════════════════════════════════════════

interface ConnectWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  connected?: boolean;
  address?: string;
}

export const ConnectWalletButton = forwardRef<HTMLButtonElement, ConnectWalletButtonProps>(
  ({ connected = false, address, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          relative overflow-hidden
          px-6 py-3
          rounded-2xl
          font-medium text-sm tracking-wide
          backdrop-blur-xl
          border
          transition-all duration-300 ease-out
          group
          ${
            connected
              ? 'bg-[#00ff00]/10 border-[#00ff00]/50 text-[#00ff00]'
              : 'bg-gradient-to-br from-[#00ff00]/25 via-[#00ff00]/15 to-[#00ff00]/5 border-[#00ff00]/60 text-[#00ff00]'
          }
          hover:border-[#00ff00]
          hover:shadow-[0_0_35px_rgba(0,255,0,0.4),inset_0_0_25px_rgba(0,255,0,0.1)]
          active:scale-[0.98]
          ${className}
        `}
        {...props}
      >
        {/* Animated border glow */}
        <span className="absolute inset-0 rounded-2xl">
          <span className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-[#00ff00]/0 via-[#00ff00]/50 to-[#00ff00]/0 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500 animate-spin-slow" />
        </span>

        {/* Inner glow */}
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-[#00ff00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {/* Pulse indicator */}
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00ff00]' : 'bg-[#00ff00]/50'} shadow-[0_0_10px_#00ff00] animate-pulse`} />
          
          {connected && address ? (
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          ) : (
            <span>Connect Wallet</span>
          )}
        </span>
      </button>
    );
  }
);

ConnectWalletButton.displayName = 'ConnectWalletButton';
