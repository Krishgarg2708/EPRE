/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        side: 'rgb(var(--side) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        mute: 'rgb(var(--mute) / <alpha-value>)',
        cyan: 'rgb(var(--cyan) / <alpha-value>)',
        red: 'rgb(var(--red) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        green: 'rgb(var(--green) / <alpha-value>)',
        blue: 'rgb(var(--blue) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', md: '6px', lg: '8px', xl: '10px' },
    },
  },
  plugins: [],
};
