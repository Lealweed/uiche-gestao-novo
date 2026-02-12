import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#070B14",
        card: "#0F172A",
        accent: "#2F7BFF",
      },
    },
  },
  plugins: [],
};

export default config;
