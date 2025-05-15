import type { Config } from 'tailwindcss';

const colors = require('tailwindcss/colors');

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    // Gradient classes
    {
      pattern: /from-(primary|primary-light|primary-dark|secondary|accent|success|warning|error|info)-(400|500|600|700)/,
    },
    {
      pattern: /to-(primary|primary-light|primary-dark|secondary|accent|success|warning|error|info)-(500|600|700|800)/,
    },
    {
      pattern: /via-(primary|primary-light|primary-dark|secondary|accent|success|warning|error|info)-(500|600)/,
    },
    // Background gradients
    'bg-gradient-to-r',
    'bg-gradient-to-br',
    'bg-gradient-to-b',
    // Text utilities
    'text-transparent',
    'bg-clip-text',
    // Group hover
    'group-hover:opacity-100',
    // Spotlight effects
    'spotlight-card',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          light: 'rgb(var(--primary-light))',
          dark: 'rgb(var(--primary-dark))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          light: 'rgb(var(--secondary-light))',
          dark: 'rgb(var(--secondary-dark))',
        },
        accent: 'rgb(var(--accent))',
        
        // UI Background colors
        'dark-bg': {
          primary: 'rgb(var(--dark-bg-primary))',
          secondary: 'rgb(var(--dark-bg-secondary))',
          tertiary: 'rgb(var(--dark-bg-tertiary))',
        },
        
        // Card colors
        'dark-card': 'rgb(var(--dark-card))',
        'dark-card-hover': 'rgb(var(--dark-card-hover))',
        'dark-border': 'rgb(var(--dark-border))',
        
        // Status colors
        success: 'rgb(var(--success))',
        warning: 'rgb(var(--warning))',
        error: 'rgb(var(--error))',
        info: 'rgb(var(--info))',
        
        // Keep standard colors
        blue: colors.blue,
        indigo: colors.indigo,
        purple: colors.purple,
        pink: colors.pink,
        green: colors.green,
        slate: colors.slate,
        gray: colors.gray,
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-spotlight': 'radial-gradient(1200px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(var(--primary), 0.075), transparent 40%)',
      },
      boxShadow: {
        spotlight: '0 0 20px 5px rgba(var(--primary), 0.1)',
        neon: '0 0 10px rgba(var(--primary), 0.5), 0 0 20px rgba(var(--primary), 0.3)',
        'neon-green': '0 0 10px rgba(var(--primary), 0.5), 0 0 20px rgba(var(--primary), 0.3)',
        'neon-accent': '0 0 10px rgba(var(--accent), 0.5), 0 0 20px rgba(var(--accent), 0.3)',
        'card-dark': '0 8px 30px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 15px rgba(var(--primary), 0.5)',
        'glow-accent': '0 0 15px rgba(var(--accent), 0.5)',
      },
      animation: {
        'spotlight': 'spotlight 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        spotlight: {
          '0%, 100%': { opacity: '0.1' },
          '50%': { opacity: '0.2' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      fontFamily: {
        'dm-sans': ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [
    function({ addUtilities, theme }: { addUtilities: any; theme: (path: string) => string }) {
      const newUtilities = {
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.text-gradient': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          'color': 'transparent',
          'background-image': `linear-gradient(to right, ${theme('colors.primary.DEFAULT')}, ${theme('colors.secondary.DEFAULT')})`,
        },
        '.text-gradient-green': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          'color': 'transparent',
          'background-image': `linear-gradient(to right, ${theme('colors.primary.DEFAULT')}, ${theme('colors.accent')})`,
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config; 