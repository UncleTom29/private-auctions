/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'rgb(10, 10, 15)',
          secondary: 'rgb(26, 26, 36)',
          tertiary: 'rgb(34, 34, 48)',
          elevated: 'rgb(42, 42, 56)',
        },
        text: {
          primary: 'rgb(255, 255, 255)',
          secondary: 'rgb(161, 161, 170)',
          muted: 'rgb(113, 113, 122)',
        },
        primary: {
          400: 'rgb(167, 139, 250)',
          500: 'rgb(147, 51, 234)',
          600: 'rgb(126, 34, 206)',
          700: 'rgb(107, 33, 168)',
        },
        accent: {
          cyan: 'rgb(6, 182, 212)',
        },
        status: {
          success: 'rgb(34, 197, 94)',
          warning: 'rgb(251, 191, 36)',
          error: 'rgb(239, 68, 68)',
          info: 'rgb(59, 130, 246)',
        },
    border: 'rgb(var(--border) / <alpha-value>)',
    ring: 'rgb(var(--ring) / <alpha-value>)',
    foreground: 'rgb(var(--foreground) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(147, 51, 234, 0.3)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;