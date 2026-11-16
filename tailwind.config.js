/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas-rgb, 228 225 219) / <alpha-value>)',
        paper: 'rgb(var(--paper-rgb, 255 255 255) / <alpha-value>)',
        glass: 'var(--glass)',
        ink: 'rgb(var(--ink-rgb, 43 42 40) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb, 107 102 94) / <alpha-value>)',
        hairline: 'rgb(var(--hairline-rgb, 210 206 197) / <alpha-value>)',
        team: {
          'software-engineer': '#4A6FA5',
          'game-developer': '#5E8C6A',
          'product-analyst': '#7B5EA7',
          'product-associate': '#C2607A',
          'data-analyst': '#3E8E93',
          'ui-ux-designer': '#D98A4A',
          'growth-analyst': '#B8962E',
          'marketing-associate': '#BF4B45',
          'founders-office': '#8A9A3B',
        },
      },
      fontFamily: {
        sans: ['"Figtree Variable"', 'sans-serif'],
        heading: ['"Bricolage Grotesque Variable"', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}
