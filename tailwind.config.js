/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./Billszip/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#070a12',
          900: '#0d131f',
          850: '#101726',
          800: '#141d2f',
          750: '#1a263c',
          700: '#202f4a',
          600: '#2e4166',
          500: '#475d86',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        slate: {
          950: '#070a12',
          900: '#0d131f',
          850: '#101726',
          800: '#141d2f',
          750: '#1a263c',
          700: '#202f4a',
          600: '#2e4166',
          500: '#475d86',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        }
      },
      fontFamily: {
        brand: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
