/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0A1F44',
        accent: '#E0B84E',
        background: '#F5F6FA',
        border: '#DDE3EE',
        textPrimary: '#0A1F44',
        textSecondary: '#3D5280',
        textMuted: '#7A8BAA',
        highRisk: '#C0392B',
        mediumRisk: '#E67E22',
        lowRisk: '#1A7A4A',
      },
      borderRadius: {
        standard: '10px',
        pill: '20px',
      },
    },
  },
  plugins: [],
};
