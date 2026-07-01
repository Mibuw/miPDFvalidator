import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Status palette used across UI + report
        pass: {
          DEFAULT: "#16a34a",
          soft: "#dcfce7",
        },
        indeterminate: {
          DEFAULT: "#d97706",
          soft: "#fef3c7",
        },
        fail: {
          DEFAULT: "#dc2626",
          soft: "#fee2e2",
        },
        ink: {
          DEFAULT: "#0b1120",
          muted: "#475569",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
