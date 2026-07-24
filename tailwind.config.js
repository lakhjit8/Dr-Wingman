/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm-neutral scale (overrides Tailwind's cool-gray "neutral") —
        // used throughout via bg-neutral-*/text-neutral-*/border-neutral-*.
        // 50 = app background, 200 = card border, 500 = secondary text,
        // 900 = primary text, per the "clean & trustworthy" design tokens.
        neutral: {
          50: '#FAFAF9',
          100: '#F5F3F0',
          200: '#E8E6E1',
          300: '#D6D3CC',
          400: '#ACA89E',
          500: '#6B6862',
          600: '#57544F',
          700: '#423F3B',
          800: '#2C2A27',
          900: '#1C1B1A',
        },
        // Primary accent — deep slate-teal, used sparingly (primary
        // buttons, active states, key icons only). Replaces the prior
        // saturated pink/red across the whole app.
        wingman: {
          50: '#EFF3F5',
          100: '#DCE5E9',
          200: '#B7C9D0',
          300: '#8FACB7',
          400: '#628C9B',
          500: '#3E6C7E',
          600: '#2B4C5C',
          700: '#223E4B',
          800: '#1A303A',
          900: '#142529',
        },
        // Positive/green-flag signal — muted sage, not a saturated green.
        sage: {
          50: '#EEF5F1',
          100: '#D9EAE1',
          200: '#B4D5C3',
          300: '#8DBFA4',
          400: '#6AA485',
          500: '#5B9074',
          600: '#4A7C64',
          700: '#3B6350',
          800: '#2D4C3E',
          900: '#23392F',
        },
        // Caution/yellow-flag signal — muted amber, not saturated red/yellow.
        amber: {
          50: '#FBF3EA',
          100: '#F5E3CE',
          200: '#EBC79C',
          300: '#DEA96C',
          400: '#CB9057',
          500: '#C28C4E',
          600: '#B8834A',
          700: '#946A3C',
          800: '#6E4C25',
          900: '#4F371B',
        },
        // Red-flag signal — muted terracotta, not saturated alarm-red, for
        // the same reason the brief avoids saturated yellow for caution.
        danger: {
          50: '#F8EEEC',
          100: '#F0DBD6',
          200: '#DFB3A9',
          300: '#CC8B7B',
          400: '#BB6E5B',
          500: '#B15F4C',
          600: '#A8574A',
          700: '#87473C',
          800: '#66362E',
          900: '#4B2822',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
