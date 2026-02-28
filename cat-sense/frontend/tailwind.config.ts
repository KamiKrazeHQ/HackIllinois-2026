import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { cat: '#FFC200' },
    },
  },
  plugins: [],
}
export default config
