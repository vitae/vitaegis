/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Vitaegis Core Palette
        vitae: {
          green: '#00ff00',
          'green-dim': '#003311',
          'green-glow': 'rgba(0, 255, 65, 0.5)',
          black: '#000000',
          white: '#ffffff',
        },
        // Instagram-style separators
        separator: 'rgba(255, 255, 255, 0.15)',
      },
      // Instagram spacing system (4px base unit)
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
      },
      // Instagram typography scale
      fontSize: {
        'ig-xs': ['12px', { lineHeight: '16px' }],
        'ig-sm': ['14px', { lineHeight: '18px' }],
        'ig-base': ['16px', { lineHeight: '20px' }],
        'ig-lg': ['20px', { lineHeight: '24px' }],
        'ig-xl': ['24px', { lineHeight: '28px' }],
        'ig-2xl': ['28px', { lineHeight: '32px' }],
      },
      // Physics-based animation timing
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ios-spring': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      borderRadius: {
        'ig-sm': '4px',
        'ig-md': '8px',
        'ig-lg': '12px',
        'ig-xl': '16px',
        'ig-2xl': '24px',
      },
    },
  },
  plugins: [],
};
