/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        zictia: {
          navy: "#0a2540",
          blue: "#0066cc",
          light: "#f6f9fc",
          accent: "#00a3e0",
          danger: "#d93025",
          success: "#188038",
          warning: "#f9ab00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
