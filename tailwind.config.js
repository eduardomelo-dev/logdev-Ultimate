/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#0f172a',
          grid: '#1e293b',
        },
        logic: {
          high: '#22c55e',      // Bright Green
          low: '#15803d',       // Dark Green
          floating: '#38bdf8',  // Cyan/Light Blue
          error: '#ef4444',     // Bright Red
        }
      }
    },
  },
  plugins: [],
};
