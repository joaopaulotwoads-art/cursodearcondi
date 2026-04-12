/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    /** Tipografia do editor: classes usadas nos node views do TipTap */
    safelist: ['not-prose', 'prose'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Open Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
                heading: ['"Open Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
                secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
                dark: '#0f172a',
            },
            borderRadius: {
                'none': '0',
                'sm': 'var(--radius)',
                'DEFAULT': 'var(--radius)',
                'md': 'var(--radius)',
                'lg': 'var(--radius)',
                'xl': 'var(--radius)',
                '2xl': 'var(--radius)',
                '3xl': 'var(--radius)',
                'full': '9999px',
            },
        },
    },
    plugins: [require('@tailwindcss/typography')],
}
