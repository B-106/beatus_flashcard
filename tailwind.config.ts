import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", 
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // 혹시 몰라 src도 추가
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;