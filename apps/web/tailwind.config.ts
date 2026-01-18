import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0b0d10',
        surface: '#11141a',
        elevated: '#161a22',
        border: '#232838',
        text: {
          primary: '#e6e8eb',
          secondary: '#9aa4b2',
          muted: '#6b7280'
        },
        accent: {
          DEFAULT: '#3b82f6',
          600: '#2563eb'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 24px rgba(59, 130, 246, 0.35)'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: [typography]
};

export default config;
