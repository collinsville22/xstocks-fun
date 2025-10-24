/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Professional Trading Terminal Color System
        // Primary - Cyan (Action/Interactive)
        primary: {
          50: '#E6FAFF',
          100: '#CCF5FF',
          200: '#99EBFF',
          300: '#66E0FF',
          400: '#33D6FF',
          500: '#00D4FF', // Main primary
          600: '#00AAD9',
          700: '#007FA3',
          800: '#00556D',
          900: '#002A36',
        },
        // Success - Green (Gains/Profits)
        success: {
          50: '#E6FFF5',
          100: '#CCFFEB',
          200: '#99FFD6',
          300: '#66FFC2',
          400: '#33FFAD',
          500: '#00FF88', // Main success
          600: '#00D972',
          700: '#00A359',
          800: '#006D3B',
          900: '#00361D',
        },
        // Danger - Pink/Red (Losses/Warnings)
        danger: {
          50: '#FFE6F0',
          100: '#FFCCE0',
          200: '#FF99C2',
          300: '#FF66A3',
          400: '#FF3385',
          500: '#FF0055', // Main danger
          600: '#D90048',
          700: '#A30036',
          800: '#6D0024',
          900: '#360012',
        },
        // Warning - Amber
        warning: {
          50: '#FFF7E6',
          100: '#FFEFCC',
          200: '#FFDF99',
          300: '#FFCF66',
          400: '#FFBF33',
          500: '#FFB000',
          600: '#D99300',
          700: '#A36F00',
          800: '#6D4A00',
          900: '#362500',
        },
        // Info - Blue
        info: {
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B8FF',
          400: '#33A0FF',
          500: '#0088FF',
          600: '#006ED9',
          700: '#0053A3',
          800: '#00376D',
          900: '#001C36',
        },
        // Dark Backgrounds (Near-black, not pure black)
        dark: {
          50: '#1A1F26',
          100: '#12151A',
          200: '#0E1117',
          300: '#0A0B0D',
          400: '#08090B',
          500: '#060708',
          primary: '#0A0B0D', // Main background
          secondary: '#12151A', // Cards/elevated surfaces
          tertiary: '#1A1F26', // Hover states
        },
        // Neutral grays with blue tint
        neutral: {
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#6C757D',
          600: '#495057',
          700: '#343A40',
          800: '#212529',
          900: '#1A1D20',
        },
        // Chart colors (for financial data visualization)
        chart: {
          green1: '#00FF88',
          green2: '#00D972',
          green3: '#00A359',
          red1: '#FF0055',
          red2: '#D90048',
          red3: '#A30036',
          blue1: '#00D4FF',
          blue2: '#00AAD9',
          blue3: '#007FA3',
          purple1: '#A78BFA',
          purple2: '#8B5CF6',
          purple3: '#7C3AED',
          orange1: '#FFB000',
          orange2: '#D99300',
          orange3: '#A36F00',
        }
      },
      fontFamily: {
        display: ['Fredoka', 'Comic Neue', 'system-ui', 'sans-serif'],
        body: ['Quicksand', 'Fredoka', 'system-ui', 'sans-serif'],
        mono: ['Comic Neue', 'Consolas', 'monospace'],
      },
      // Playful Theme Colors (Trugly-inspired)
      colors: {
        ...require('tailwindcss/colors'),
        playful: {
          green: '#7EC850',
          sky: '#87CEEB',
          cream: '#FFF8DC',
          beige: '#F5F5DC',
          orange: '#F4A460',
          darkText: '#2C2C2C',
          border: '#000000',
        },
      },
      fontSize: {
        // Typography scale with line heights
        'xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],  // 15px
        'lg': ['1.0625rem', { lineHeight: '1.75rem' }],   // 17px
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],    // 36px
        '5xl': ['3rem', { lineHeight: '3.5rem' }],        // 48px
        '6xl': ['4rem', { lineHeight: '4.5rem' }],        // 64px
      },
      spacing: {
        // 8px base spacing system
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',   // 6px
        '2': '0.5rem',       // 8px
        '3': '0.75rem',      // 12px
        '4': '1rem',         // 16px
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px
        '8': '2rem',         // 32px
        '10': '2.5rem',      // 40px
        '12': '3rem',        // 48px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
        xl: '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 212, 255, 0.08)',
        'glass-lg': '0 16px 48px 0 rgba(0, 212, 255, 0.12)',
        'glow-primary': '0 0 24px rgba(0, 212, 255, 0.4)',
        'glow-success': '0 0 24px rgba(0, 255, 136, 0.4)',
        'glow-danger': '0 0 24px rgba(255, 0, 85, 0.4)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'ticker': 'ticker 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'scale(1.1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}