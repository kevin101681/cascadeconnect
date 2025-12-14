/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./lib/bluetag/**/*.{js,ts,jsx,tsx}",
    "./lib/cbsbooks/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // BlueTag critical classes that might be dynamically generated
    'bg-white',
    'dark:bg-slate-900',
    'bg-slate-100',
    'dark:bg-slate-800',
    'bg-slate-50',
    'dark:bg-slate-800/50',
    'text-slate-700',
    'dark:text-slate-200',
    'text-slate-500',
    'dark:text-slate-400',
    'text-slate-600',
    'text-slate-300',
    'text-slate-800',
    'border-slate-200',
    'dark:border-slate-800',
    'border-slate-700',
    'border-slate-600',
    'border-slate-100',
    'rounded-[32px]',
    'rounded-2xl',
    'rounded-xl',
    'rounded-full',
    'rounded-[20px]',
    'bg-primary',
    'text-primary',
    'bg-primary/10',
    'dark:bg-primary/20',
    'border-primary/20',
    'dark:border-primary/30',
    'hover:bg-primary/20',
    'dark:hover:bg-primary/30',
    'ring-primary',
    'bg-primary/5',
    'border-primary/50',
    'hover:border-primary/50',
    'border-solid',
    'hover:bg-slate-200',
    'dark:hover:bg-slate-700',
    'hover:text-primary',
    'dark:hover:text-primary',
    'active:scale-95',
    'active:scale-[0.99]',
    // Modal styling
    'bg-black/60',
    'backdrop-blur-md',
    'backdrop-blur-sm',
    'shadow-xl',
    'shadow-2xl',
    'z-[200]',
    'z-[100]',
    // Animation classes
    'animate-fade-in',
    'animate-dialog-enter',
    'animate-slide-up',
    'animate-scale-out',
    // Text and spacing
    'font-bold',
    'font-semibold',
    'font-medium',
    'max-w-4xl',
    'max-w-2xl',
    'max-w-sm',
    'h-[90vh]',
    'h-[80vh]',
    // CBS Books FAB positioning
    'fixed',
    'bottom-8',
    'right-8',
    'z-50',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans Flex"', 'Outfit', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Cascade Connect Material 3 Palette based on #3c6b80
        primary: {
          DEFAULT: '#3c6b80', // Base Color
          container: '#bde9ff',
          on: '#ffffff',
          'on-container': '#001f2a',
        },
        secondary: {
          DEFAULT: '#4c616b',
          container: '#cfe6f1',
          on: '#ffffff',
          'on-container': '#071e26',
        },
        tertiary: {
          DEFAULT: '#5d5b7d',
          container: '#e3dfff',
          on: '#ffffff',
          'on-container': '#1a1836',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          on: '#ffffff',
          'on-container': '#410002',
        },
        surface: {
          DEFAULT: '#ffffff', // Surface (White for cards/modals) - Light mode
          dim: '#d5dbdc',
          container: '#f0f4f6', // Surface Container
          'container-high': '#eceff1',
          'container-lowest': '#fafbfc',
          'on': '#171c1f',
          'on-variant': '#40484c',
          outline: '#70787d',
          'outline-variant': '#c0c8cc'
        },
        // BlueTag custom slate colors
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#1e293b', // BlueTag custom
          900: '#0f172a',
          950: '#020617',
        },
      },
      transitionTimingFunction: {
        'gentle': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'elevation-1': '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
        'elevation-2': '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
        'elevation-3': '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'backdrop-fade-in': {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(4px)' },
        },
        'backdrop-fade-out': {
          '0%': { opacity: '1', backdropFilter: 'blur(4px)' },
          '100%': { opacity: '0', backdropFilter: 'blur(0px)' },
        },
        // BlueTag keyframes - full set
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slowFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        expandHorizontal: {
          '0%': { maxWidth: '0' },
          '100%': { maxWidth: '600px' },
        },
        collapseHorizontal: {
          '0%': { maxWidth: '600px', opacity: '1' },
          '100%': { maxWidth: '0', opacity: '0', padding: '0', margin: '0' },
        },
        expandSections: {
          '0%': { opacity: '0', maxHeight: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', maxHeight: '2000px', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDownExit: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(40px)', opacity: '0' },
        },
        dialogEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        dialogExit: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(20px)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(50px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-50px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        // Cascade Connect animations
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-in',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'backdrop-fade-in': 'backdrop-fade-in 0.2s ease-out',
        'backdrop-fade-out': 'backdrop-fade-out 0.2s ease-in',
        // BlueTag animations - full set
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'slow-fade-in': 'slowFadeIn 2s ease-out forwards',
        'fadeOut': 'fadeOut 0.3s ease-in forwards',
        'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
        'fade-in-scale': 'fadeInScale 1.5s cubic-bezier(0.2, 0, 0, 1) forwards',
        'scale-out': 'scaleOut 0.5s cubic-bezier(0.2, 0, 0, 1) forwards',
        'expand-horizontal': 'expandHorizontal 1.5s cubic-bezier(0.2, 0, 0, 1) forwards',
        'collapse-horizontal': 'collapseHorizontal 1.5s cubic-bezier(0.2, 0, 0, 1) forwards',
        'expand-sections': 'expandSections 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 1.0s',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.2, 0.0, 0, 1.0) both',
        'slide-down': 'slideDown 1s cubic-bezier(0.2, 0.0, 0, 1.0) forwards',
        'slide-down-exit': 'slideDownExit 0.6s cubic-bezier(0.2, 0.0, 0, 1.0) forwards',
        'dialog-enter': 'dialogEnter 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0) forwards',
        'dialog-exit': 'dialogExit 0.3s cubic-bezier(0.3, 0.0, 0.8, 0.15) forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'slide-in-from-right': 'slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
      }
    }
  },
  plugins: [],
}

