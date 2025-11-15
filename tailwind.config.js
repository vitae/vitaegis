/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        futura: ["Futura Book", "Futura", "Courier New", "monospace", "sans-serif"]
      },
      colors: {
        patagios: {
          neon: "#00FF00"
        }
      },
      backdropBlur: {
        'md': '12px'
      }
    }
  },
  plugins: []
};
