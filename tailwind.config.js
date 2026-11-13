/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tamkeen brand, sampled from tamkeentraining.com
        brand: {
          50: '#eef7f9',
          100: '#d3ebef',
          200: '#a7d6df',
          300: '#71bac9',
          400: '#4499ad',
          500: '#36748b',
          600: '#006473', // primary
          700: '#025360',
          800: '#06424c',
          900: '#08343c',
        },
        accent: {
          50: '#fff5ed',
          100: '#ffe7d3',
          200: '#ffcaa6',
          300: '#ffa46e',
          400: '#fd7f3a',
          500: '#f76a0c', // CTA orange
          600: '#e05205',
          700: '#b93c07',
          800: '#93310e',
          900: '#772b0f',
        },
        gold: {
          400: '#b99a5b',
          500: '#997d40',
          600: '#7d6533',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Almarai', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(8, 52, 60, 0.04), 0 4px 16px -4px rgba(8, 52, 60, 0.08)',
        pop: '0 8px 32px -8px rgba(8, 52, 60, 0.22)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
