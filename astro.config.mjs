// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    /**
     * `ignore` = dev e produção aceitam com ou sem barra (evita 404 ao testar sem `/` no fim).
     * O middleware ainda faz 301 para a versão com barra — canonical e sitemap continuam com `/`.
     */
    trailingSlash: 'ignore',
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
