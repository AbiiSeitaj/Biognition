/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          accent: "#0891b2",
          danger: "#dc2626",
          warn: "#d97706",
          ok: "#059669",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        medical: "0 4px 24px -4px rgba(13, 148, 136, 0.12)",
        "medical-lg": "0 8px 32px -8px rgba(13, 148, 136, 0.18)",
      },
    },
  },
  plugins: [],
};
