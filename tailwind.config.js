/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#60a5fa',
          DEFAULT: '#0061ff',
          dark: '#0056e0',
        },
      },
    },
  },
  plugins: [],
}
