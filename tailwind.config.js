/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        // Material 3 Palette based on #3c6b80
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
          DEFAULT: '#ffffff', // Surface (White for cards/modals)
          dim: '#d5dbdc',
          container: '#f0f4f6', // Surface Container
          'container-high': '#eceff1',
          'on': '#171c1f',
          'on-variant': '#40484c',
          outline: '#70787d',
          'outline-variant': '#c0c8cc'
        }
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
      }
    }
  },
  plugins: [],
}

