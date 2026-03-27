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
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
