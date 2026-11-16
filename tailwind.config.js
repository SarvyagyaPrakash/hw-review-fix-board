/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        paper: 'var(--paper)',
        glass: 'var(--glass)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        hairline: 'var(--hairline)',
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
