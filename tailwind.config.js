/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mtm-blue': {
          50: '#eff8ff',
          100: '#dff1ff',
          200: '#b8e3ff',
          300: '#78cdff',
          400: '#30b4ff',
          500: '#069df0',
          600: '#007ccd',
          700: '#0063a6',
          800: '#005489',
          900: '#064671',
        },
      },
    },
  },
  plugins: [],
}