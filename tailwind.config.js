/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wingman: {
          50: '#fff1f6',
          100: '#ffe0eb',
          200: '#ffc2d8',
          300: '#ff94b8',
          400: '#ff5f95',
          500: '#f92e73',
          600: '#e5135a',
          700: '#c10a49',
          800: '#a10b41',
          900: '#890c3c',
        },
      },
    },
  },
  plugins: [],
}
