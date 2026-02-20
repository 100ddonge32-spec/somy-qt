import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                somy: {
                    primary: "#E8D5B5",
                    accent: "#D4AF37",
                    dark: "#5D5A56",
                    sage: "#8E9775",
                }
            },
        },
    },
    plugins: [],
};
export default config;
