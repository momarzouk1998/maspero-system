/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Maspero Logo Official Color Palette
        maspero: {
          dark: '#0b1329',      // Base Obsidian Dark
          navy: '#0f172a',      // Panel Dark
          cyan: '#0284c7',      // Cyan Swoosh (Primary Accent)
          magenta: '#e11d48',   // Magenta Pink Swoosh & "و" Letter
          pink: '#db2777',      // Vivid Pink Accent
          yellow: '#eab308',    // Yellow Swoosh
          gold: '#f59e0b',      // Amber Gold
          black: '#000000',     // Logo Core
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
