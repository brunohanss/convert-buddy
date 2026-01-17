import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6f8',
          100: '#e6ebf0',
          200: '#c7d1db',
          300: '#a6b3c1',
          400: '#7b8a9b',
          500: '#59697c',
          600: '#3d4a5a',
          700: '#2a3542',
          800: '#1b242f',
          900: '#0d141c'
        },
        accent: {
          500: '#2f6fec',
          600: '#245bd0'
        }
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(15, 23, 42, 0.08), 0 6px 20px rgba(15, 23, 42, 0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: [typography]
};

export default config;
