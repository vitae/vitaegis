import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vitae: {
          green: '#00ff41',
          'green-dim': '#003311',
          'green-glow': 'rgba(0, 255, 65, 0.5)',
          black: '#000000',
        },
      },
      fontFamily: {
        display: ['Futura', 'Trebuchet MS', 'Arial', 'sans-serif'],
        body: ['Futura Book', 'Futura', 'Trebuchet MS', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'flicker': 'flicker 5s linear infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 255, 65, 0.5)',
        'glow-md': '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
        'glow-lg': '0 0 40px #00ff41, 0 0 80px rgba(0, 255, 65, 0.5), 0 0 120px rgba(0, 255, 65, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
