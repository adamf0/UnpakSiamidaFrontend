/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        mulish: ['Mulish', 'sans-serif'],
        dmSans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [
  ],
}