import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ds: {
          bg: "#0B0F1A",
          surface1: "#111827",
          surface2: "#1F2937",
          sidebar: "#0D1117",
          primary: "#3B82F6",
          "primary-hover": "#60A5FA",
          accent: "#22C55E",
          text: "#E5E7EB",
          muted: "#9CA3AF",
          subtle: "#6B7280",
          danger: "#EF4444",
          warning: "#FBBF24",
        },
        sapphire: {
          100: "#eaf1ff",
          200: "#a9c3f7",
          300: "#4f7acb",
          400: "#3161b7",
          600: "#183168",
          700: "#142a5a",
        },
        yellow: {
          400: "#ffd700",
          600: "#bfa100",
        },
        emerald: {
          400: "#34d399",
          600: "#059669",
        },
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
