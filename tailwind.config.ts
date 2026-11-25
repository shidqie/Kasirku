import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          200: "var(--primary-border)",
          500: "var(--primary)",
          600: "var(--primary)",
          700: "var(--primary-hover)",
          800: "var(--primary-active)",
        },
        secondary: {
          DEFAULT: "var(--primary)",
          50: "var(--primary-light)",
          100: "var(--primary-light)",
          500: "var(--primary)",
          600: "var(--primary)",
          700: "var(--primary-hover)",
        },
        success: {
          DEFAULT: "#16A34A",
          50: "#F0FDF4",
          100: "#DCFCE7",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          DEFAULT: "#D97706",
          50: "#FFFBEB",
          100: "#FEF3C7",
          600: "#D97706",
          700: "#B45309",
        },
        danger: {
          DEFAULT: "#DC2626",
          50: "#FEF2F2",
          100: "#FEE2E2",
          600: "#DC2626",
          700: "#B91C1C",
        },
        surface: "#FFFFFF",
        text: "#111827",
        neutral: "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-jakarta)", "'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jakarta)", "'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
};
export default config;

