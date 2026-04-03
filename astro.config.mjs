// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    /** Mesma forma de URL que canonical e Google (sem / no fim dos posts/páginas). */
    trailingSlash: 'never',
    adapter: vercel(),
    /** CSS inline no HTML → menos pedidos bloqueantes no caminho crítico (Lighthouse / LCP). */
    build: {
        inlineStylesheets: 'always',
    },
    integrations: [
        react({
            // classic evita erro "jsxDEV is not a function" com client:only em dev
            jsxRuntime: 'classic',
        }),
        tailwind(), 
        markdoc({ allowHTML: true })
    ],
    // Reset Trigger: 2026-02-07 11:40
});
