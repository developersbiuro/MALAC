/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#f85606", dark: "#d84804", light: "#fff0e8" },
        // Exact warm-ivory family mined from malacpk's stylesheet:
        // page bg #fdfbf7, ivory sections #faf6ee / #f8f5ee, deep cream #f3efe6.
        cream: { DEFAULT: "#fdfbf7", soft: "#faf6ee", alt: "#f8f5ee", deep: "#f3efe6", line: "#f0e7d8" },
        // malacpk ink + amber/gold scale: #0f172a / #05070b ink,
        // #b45309 burnt orange, #d97706 amber, #f59e0b gold, #e5a93c / #fcd34d highlights.
        lux: { ink: "#0f172a", deep: "#05070b", burnt: "#b45309", amber: "#d97706", gold: "#f59e0b", soft: "#e5a93c", pale: "#fcd34d" },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Cinzel", "serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
