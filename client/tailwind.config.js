/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2377bb',
        lineBlue: '#4299e1',
        textMain: '#2c3e50',
        textLight: '#64748b',
        danger: '#e53e3e',
        success: '#38a169',
        warn: '#dd6b20',
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
          400: '#2dd4bf',
        },
      },
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
