import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        barlow:    ['Barlow', 'sans-serif'],
      },
      colors: {
        cat:         '#FFCD11',
        'cat-dark':  '#0D0D0D',
        'cat-black': '#1A1A1A',
        'cat-gray':  '#2A2A2A',
      },
      keyframes: {
        fadeSlideIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        catPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
      },
      animation: {
        'fade-slide-in': 'fadeSlideIn 0.25s ease-out both',
        'fade-in':       'fadeIn 0.15s ease-out both',
        'slide-down':    'slideDown 0.2s ease-out both',
        'cat-pulse':     'catPulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
