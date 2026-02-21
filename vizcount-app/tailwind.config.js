/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#00C4A7',
          dark: '#16191C',
          darker: '#0D0F11',
          light: '#FCFBF4',
          card: '#1D2125',
          text: '#E1E3E6',
          muted: '#8B949E'
        }
      }
    },
  },
  plugins: [],
}
