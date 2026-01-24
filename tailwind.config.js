/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066CC',
        dark: '#1D1D1F',
        light: '#F5F5F7',
      }
    },
  },
  plugins: [],
}
