/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        surface2: "#1a1a1a",
        surface3: "#222222",
        accent: "#c8f135",
        "accent-2": "#a3d420",
        muted: "#888888",
        "muted-2": "#444444",
        danger: "#ff4d4d",
        pending: "#f5a623",
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}