import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ═══════════════════════════════════════════════════════════════════════
      // Instagram Design System
      // ═══════════════════════════════════════════════════════════════════════
      
      // Instagram spacing (4px base grid)
      spacing: {
        'ig-1': '4px',
        'ig-2': '8px',
        'ig-3': '12px',
        'ig-4': '16px',
        'ig-5': '20px',
        'ig-6': '24px',
        'ig-8': '32px',
        'ig-10': '40px',
        'ig-12': '48px',
        // Safe area
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      
      // Instagram typography scale
      fontSize: {
        'ig-xs': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'ig-sm': ['14px', { lineHeight: '20px', letterSpacing: '0' }],
        'ig-base': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'ig-lg': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        'ig-xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        'ig-2xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
      },
      
      // Vitaegis colors
      colors: {
        vitae: {
          green: '#00ff00',
          'green-dim': '#003311',
          'green-glow': 'rgba(0, 255, 65, 0.5)',
          black: '#000000',
          white: '#ffffff',
        },
        // Instagram separator (15% opacity)
        separator: 'rgba(255, 255, 255, 0.15)',
        // Glass backgrounds
        glass: {
          DEFAULT: 'rgba(0, 0, 0, 0.2)',
          subtle: 'rgba(0, 0, 0, 0.1)',
          prominent: 'rgba(0, 0, 0, 0.3)',
          nav: 'rgba(0, 0, 0, 0.7)',
        },
      },
      
      // Futura font stack
      fontFamily: {
        futura: [
          'Futura',
          'Futura Medium',
          'Futura-Medium',
          'Jost',
          'Century Gothic',
          'CenturyGothic',
          'AppleGothic',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'sans-serif',
        ],
      },
      
      // Physics-based animations (iOS spring curves)
      transitionTimingFunction: {
        'ios-spring': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      
      // Animation durations
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      
      // Keyframe animations
      keyframes: {
        'ios-spring-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'tab-bounce': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)' },
          '50%': { boxShadow: '0 0 40px #00ff00, 0 0 60px rgba(0, 255, 65, 0.5)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) translateZ(0)' },
          '50%': { transform: 'translateY(-10px) translateZ(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px) translateZ(0)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateZ(0)' },
        },
        'rubber-band': {
          '0%': { transform: 'scaleY(1)' },
          '30%': { transform: 'scaleY(1.05)' },
          '40%': { transform: 'scaleY(0.95)' },
          '50%': { transform: 'scaleY(1.02)' },
          '65%': { transform: 'scaleY(0.98)' },
          '75%': { transform: 'scaleY(1.01)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      
      animation: {
        'ios-spring-in': 'ios-spring-in 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'tab-bounce': 'tab-bounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'skeleton': 'skeleton-shimmer 1.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'rubber-band': 'rubber-band 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      
      // Border radius
      borderRadius: {
        'ig': '4px',
        'ig-md': '8px',
        'ig-lg': '12px',
        'ig-xl': '16px',
        'ig-2xl': '20px',
      },
      
      // Box shadows with glow effects
      boxShadow: {
        'neon': '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3)',
        'neon-lg': '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      
      // Backdrop blur
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '40px',
      },
      
      // Z-index scale
      zIndex: {
        'background': '-1',
        'content': '10',
        'nav': '50',
        'modal': '100',
        'toast': '150',
      },
    },
  },
  plugins: [],
};

export default config;
