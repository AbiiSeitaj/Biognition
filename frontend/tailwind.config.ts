/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          950: "#0a1628",
          900: "#0f2744",
          800: "#163656",
          700: "#1e4976",
          600: "#2563eb",
          accent: "#06b6d4",
          danger: "#ef4444",
          warn: "#f59e0b",
          ok: "#10b981",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};
