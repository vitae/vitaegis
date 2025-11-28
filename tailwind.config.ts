import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Century Gothic', 'Avant Garde', 'sans-serif'],
        display: ['Century Gothic', 'Avant Garde', 'sans-serif'],
        body: ['Century Gothic', 'Avant Garde', 'sans-serif'],
      },
      colors: {
        vitae: {
          green: '#00ff41',
          black: '#000000',
          white: '#ffffff',
        },
        matrix: {
          green: '#00ff41',
          dark: '#003311',
          glow: 'rgba(0, 255, 65, 0.5)',
        },
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 255, 65, 0.5)',
        'neon-md': '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
        'neon-lg': '0 0 40px #00ff41, 0 0 80px rgba(0, 255, 65, 0.5), 0 0 120px rgba(0, 255, 65, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)' },
          '50%': { boxShadow: '0 0 40px #00ff41, 0 0 60px rgba(0, 255, 65, 0.5)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
