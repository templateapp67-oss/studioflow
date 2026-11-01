/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sandal: 'rgb(var(--sandal-rgb) / <alpha-value>)',
        neem: 'rgb(var(--neem-rgb) / <alpha-value>)',
        turmeric: 'rgb(var(--turmeric-rgb) / <alpha-value>)',
        terracotta: 'rgb(var(--terracotta-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        paper: 'var(--paper)', muted: 'var(--muted)', line: 'var(--line)',
      },
      fontFamily: { display: ['Cormorant Garamond', 'Georgia', 'serif'], body: ['Manrope', 'sans-serif'], hindi: ['Tiro Devanagari Hindi', 'serif'] },
      boxShadow: { soft: '0 20px 70px -25px rgb(30 27 22 / 22%)' },
    },
  },
  plugins: [],
};
