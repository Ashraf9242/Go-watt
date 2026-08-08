/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './en/index.html', './*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Tokens resolve to the CSS custom properties in src/styles/tokens.css,
      // so a day/night switch is a single attribute flip on <html>.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        ink: 'var(--text)',
        'ink-2': 'var(--text-2)',
        'ink-3': 'var(--text-3)',
        green: 'var(--brand-green)',
        'green-strong': 'var(--brand-green-strong)',
        amber: 'var(--brand-amber)',
        'amber-text': 'var(--amber-text-safe)',
        charging: 'var(--state-charging)',
        complete: 'var(--state-complete)',
      },
      fontFamily: {
        ar: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        latin: ['Montserrat', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { card: '26rem' },
    },
  },
  plugins: [],
}
