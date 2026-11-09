/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#CC10FE',
        accent: '#E281FF',
        secondary: '#0F172A',
        success: '#34A853',
        warning: '#FBBC05',
        background: '#F5F7FA',
      },
    },
  },
  plugins: [],
};
