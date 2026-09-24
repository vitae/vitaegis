/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Jost', 'Century Gothic', 'Avant Garde', 'sans-serif'],
        display: ['Jost', 'Century Gothic', 'Avant Garde', 'sans-serif'],
        body: ['Jost', 'Century Gothic', 'Avant Garde', 'sans-serif'],
      },
      // Vitaegis palette: pure neon on black. Mirrors --vitae-* in app/globals.css
      // and the vitaegis-brand skill; change all three together.
      colors: {
        vitae: {
          green: '#00ff00',
          'green-dim': '#003311',
          'green-glow': 'rgba(0, 255, 0, 0.5)',
          red: '#ff0000',
          magenta: '#ff00ff',
          yellow: '#ffff00',
          cyan: '#00ffff',
          orange: '#f7931a',
          blue: '#1a7df7',
          black: '#000000',
          white: '#ffffff',
          gray: '#808080',
        },
        matrix: {
          green: '#00ff00',
          dark: '#003311',
          glow: 'rgba(0, 255, 0, 0.5)',
        },
        glass: {
          DEFAULT: 'rgba(0, 0, 0, 0.2)',
          subtle: 'rgba(0, 0, 0, 0.1)',
          prominent: 'rgba(0, 0, 0, 0.3)',
          nav: 'rgba(0, 0, 0, 0.7)',
        },
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 255, 0, 0.5)',
        'neon-md': '0 0 20px rgba(0, 255, 0, 0.5), 0 0 40px rgba(0, 255, 0, 0.3)',
        'neon-lg':
          '0 0 40px #00ff00, 0 0 80px rgba(0, 255, 0, 0.5), 0 0 120px rgba(0, 255, 0, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'matrix-fall': 'matrix-fall 10s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)' },
          '50%': { boxShadow: '0 0 40px #00ff00, 0 0 60px rgba(0, 255, 0, 0.5)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'matrix-fall': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
