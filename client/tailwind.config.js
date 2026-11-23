/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg)',
        surface: 'var(--surface-solid)',
        ink: 'var(--ink)',
        inksoft: 'var(--ink-soft)',
        faint: 'var(--ink-faint)',
        brand: {
          DEFAULT: 'var(--brand)',
          soft: 'var(--brand-soft)',
          text: 'var(--brand-text)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
