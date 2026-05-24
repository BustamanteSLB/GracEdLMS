/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Platform-specific secondary colors
        primary: {
          android: '#22C55E',
          ios: '#3B82F6',
          web: '#6D28D9', 
        },
        secondary: {
          android: '#4ADE80',
          ios: '#93C5FD',
          web: '#A78BFA',
        },
        // Dark mode colors
        dark: {
          bg: '#1A1A1A',
          text: '#F5F5F5',
        },
      },
      fontFamily: {
        inter_bold: ['Inter-Bold', 'sans-serif'],
        inter_medium: ['Inter-Medium', 'sans-serif'],
        inter_regular: ['Inter-Regular', 'sans-serif'],
        inter_semibold: ['Inter-SemiBold', 'sans-serif'],
        pregular: ['Poppins-Regular', 'sans-serif'],
        pbold: ['Poppins-Bold', 'sans-serif'],
        psemibold: ['Poppins-SemiBold', 'sans-serif'],
      },
      screens: {
        '2xs': { min: '300px' },
        xs: { max: '575px' }, // Mobile (iPhone 3 - iPhone XS Max).
        sm: { min: '576px', max: '897px' }, // Mobile (matches max: iPhone 11 Pro Max landscape @ 896px).
        md: { min: '898px', max: '1199px' }, // Tablet (matches max: iPad Pro @ 1112px).
        lg: { min: '1200px' }, // Desktop smallest.
        xl: { min: '1259px' }, // Desktop wide.
        '2xl': { min: '1359px' } // Desktop widescreen.
      },
    },
  },
  plugins: [],
}
