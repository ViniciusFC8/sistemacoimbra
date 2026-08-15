import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config = {
  darkMode: "class",
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border-default)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        input: "var(--border-default)",
        ring: "var(--primary-glow)",
        background: "var(--background)",
        "background-deep": "var(--background-deep)",
        "background-elevated": "var(--background-elevated)",
        foreground: "var(--foreground)",
        "foreground-secondary": "var(--foreground-secondary)",
        sidebar: "var(--sidebar)",
        "sidebar-elevated": "var(--sidebar-elevated)",
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "#000000",
          hover: "var(--primary-strong)",
          muted: "var(--primary-muted)",
          glow: "var(--primary-glow)",
          dark: "var(--primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--surface-elevated)",
          foreground: "var(--foreground)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--foreground)",
        },
        muted: {
          DEFAULT: "var(--surface-elevated)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--surface-hover)",
          foreground: "var(--foreground)",
        },
        popover: {
          DEFAULT: "var(--surface-elevated)",
          foreground: "var(--foreground)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--foreground)",
          elevated: "var(--surface-elevated)",
          high: "var(--surface-high)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        sora: ["var(--font-sora)", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;

export default config;
