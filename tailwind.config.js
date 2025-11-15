/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        matrix: {
          green: '#00ff41',
          'green-dark': '#003B00',
          'green-light': '#00ff88',
        },
        neon: '#00FF00',
      },
      animation: {
        'matrix-pulse': 'matrix-pulse 2s ease-in-out infinite',
        'glitch': 'glitch 0.3s ease-in-out',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
