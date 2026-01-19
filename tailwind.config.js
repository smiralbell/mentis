/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brighter yellow, closer to reference
        'mentis-yellow': '#FFCF00',
        'mentis-yellow-light': '#FFF5B8',
        'mentis-navy': '#1A1F3A',
        'mentis-white': '#FEFEFE',
      },
    },
  },
  plugins: [],
}


