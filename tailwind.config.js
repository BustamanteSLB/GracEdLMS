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
        inter_black: ['Inter-28pt-Black', 'sans-serif'],
        inter_bold: ['Inter-24pt-Bold', 'sans-serif'],
        inter_extrabold: ['Inter-28pt-ExtraBold', 'sans-serif'],
        inter_extralight: ['Inter-18pt-ExtraLight', 'sans-serif'],
        inter_italic: ['Inter-18pt-Italic', 'sans-serif'],
        inter_light: ['Inter-18pt-Light', 'sans-serif'],
        inter_medium: ['Inter-18pt-Medium', 'sans-serif'],
        inter_regular: ['Inter-18pt-Regular', 'sans-serif'],
        inter_semibold: ['Inter-24pt-SemiBold', 'sans-serif'],
        inter_thin: ['Inter-18pt-Thin', 'sans-serif'],

        pblack: ['Poppins-Black', 'sans-serif'],
        pbold: ['Poppins-Bold', 'sans-serif'],
        pextrabold: ['Poppins-ExtraBold', 'sans-serif'],
        pextralight: ['Poppins-ExtraLight', 'sans-serif'],
        pitalic: ['Poppins-Italic', 'sans-serif'],
        plight: ['Poppins-Light', 'sans-serif'],
        pmedium: ['Poppins-Medium', 'sans-serif'],
        pregular: ['Poppins-Regular', 'sans-serif'],
        psemibold: ['Poppins-SemiBold', 'sans-serif'],
        pthin: ['Poppins-Thin', 'sans-serif'],
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
