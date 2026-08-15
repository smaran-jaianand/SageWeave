import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paper Blueprint Design System
        paper: '#F5F0E8',
        'paper-bright': '#FFFFFF',
        'paper-dim': '#E8E4DC',
        'paper-muted': '#DAD6CE',
        ink: '#1A1A1A',
        'ink-dim': '#444748',
        'ink-muted': '#747878',
        accent: {
          yellow: '#FFCC00',
          'yellow-dim': '#E6B800',
          red: '#E63B2E',
          blue: '#0055FF',
          bronze: '#C29F60',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          variant: '#E2E2E2',
          container: '#EEEEEE',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline-lg': ['40px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'headline-md': ['24px', { lineHeight: '1.3' }],
        'headline-sm': ['18px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '9999px', // keep for pill shapes only when needed
      },
      boxShadow: {
        'hard': '4px 4px 0px #1A1A1A',
        'hard-sm': '2px 2px 0px #1A1A1A',
        'hard-yellow': '4px 4px 0px #FFCC00',
        'hard-red': '4px 4px 0px #E63B2E',
        'hard-blue': '4px 4px 0px #0055FF',
        none: 'none',
      },
      spacing: {
        sidebar: '228px',
        topbar: '56px',
      },
    },
  },
  plugins: [],
} satisfies Config
