/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { futura: ["Futura Book", "sans-serif"] },
      colors: { neon: "#00FF00" }
    }
  },
  plugins: []
};
