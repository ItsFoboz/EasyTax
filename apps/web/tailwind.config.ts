import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bulgarian flag green, muted to feel professional rather than patriotic.
        brand: {
          50: "#f0faf6",
          100: "#daf2e7",
          200: "#b6e5cf",
          300: "#85d0ad",
          400: "#52b387",
          500: "#2f9869",
          600: "#1f7c54",
          700: "#196245",
          800: "#164e38",
          900: "#13402f",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
