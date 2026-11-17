/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#101014", dark: "#000000", light: "#e8eaee" },
        // SILVER THEME (Abdullah's reference designs, 2026-11-16): the old
        // cream class names now carry the silver palette so every page
        // inherits it — page bg light silver #f1f1f3, panels #e9eaee /
        // #f6f6f8, hairlines #d7d8de.
        cream: { DEFAULT: "#f1f1f3", soft: "#e9eaee", alt: "#f6f6f8", deep: "#dedfe4", line: "#d7d8de" },
        // lux scale remapped from gold to graphite/silver: ink #101014,
        // deep #060607 (near-black), burnt #3f444b (dark graphite accent),
        // amber #6d7278, gold #c3c9d1 (light silver), soft #a7adb6,
        // pale #e8eaee.
        lux: { ink: "#101014", deep: "#060607", burnt: "#3f444b", amber: "#6d7278", gold: "#c3c9d1", soft: "#a7adb6", pale: "#e8eaee" },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Cinzel", "serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
      boxShadow: {
        // Cool silver-theme shadows (were warm cream-luxury).
        lux: "0 16px 40px -16px rgba(10,10,14,0.28)",
        header: "0 1px 0 0 rgba(255,255,255,0.08), 0 12px 32px -20px rgba(10,10,14,0.55)",
      },
    },
  },
  plugins: [],
};
