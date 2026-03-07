import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#D4A855",
        "sand-light": "#F0D080",
        "brown-dark": "#3B1F0A",
        "brown-mid": "#7B4A1E",
        "brown-light": "#A0522D",
        "red-west": "#C0392B",
        "red-700": "#8B0000",
        gold: "#FFD700",
        sky: "#87CEEB",
        "sunset-1": "#FF6B35",
        "sunset-2": "#F7C59F",
        "black-ink": "#1A0A00",
        parchment: "#F5E6C8",
      },
      fontFamily: {
        western: ["Rye", "serif"],
        marker: ["Permanent Marker", "cursive"],
        stats: ["Oswald", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
