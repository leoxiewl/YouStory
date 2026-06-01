import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#20201f",
        paper: "#f7f7f5",
        mist: "#eeeeeb",
        line: "#e3e3df",
        quiet: "#73736d",
        story: "#0f6bff",
        ember: "#ff5b4a",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(35, 35, 31, 0.08)",
        soft: "0 10px 30px rgba(35, 35, 31, 0.07)",
      },
    },
  },
  plugins: [],
}

export default config
