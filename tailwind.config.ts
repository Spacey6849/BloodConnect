import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f8ff',
          100: '#d9edff',
          200: '#a6d4ff',
          300: '#73bbff',
          400: '#409fff',
          500: '#0d84ff',
          600: '#0066db',
          700: '#004da8',
          800: '#003575',
          900: '#001c42'
        },
        success: '#1f9d55',
        warning: '#f59e0b',
        danger: '#ef4444'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}

export default config
