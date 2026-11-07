import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)"],
        // Existing screen titles use font-serif. Keep them in the Vietnamese UI family.
        serif: ["var(--font-ui)"],
        mono: ["var(--font-numeric)"],
      },
      colors: {
        cream: {
          50: "#FAF7F0",
          100: "#F4EFE6",
          200: "#EAE1D2",
        },
        forest: {
          DEFAULT: "#214E43",
          hover: "#1A3E35",
          light: "#2C6658",
        },
        terracotta: {
          DEFAULT: "#A84832",
          hover: "#8C3B28",
          light: "#C15D45",
        },
        ink: {
          DEFAULT: "#1F2933",
          muted: "#52606D",
          light: "#7B8794",
        },
      },
    },
  },
  plugins: [],
};
export default config;
