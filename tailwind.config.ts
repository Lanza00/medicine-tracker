import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E2A44",
        muted: "#6B7790",
        line: "#E3EAF5",
        sky: "#F3F7FD",
        brand: { DEFAULT: "#4F7BF7", dark: "#3A63D6", soft: "#E3ECFE" },
        peach: { DEFAULT: "#FFB27A", soft: "#FFF0E3" },
        mint: { DEFAULT: "#2EBD85", soft: "#DDF6EB" },
        coral: { DEFAULT: "#F0636F", soft: "#FDE7E9" },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,42,68,0.04), 0 4px 14px rgba(30,42,68,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
