// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import markdoc from '@astrojs/markdoc';
import { rehypeHotmartSrc } from './src/utils/hotmart-src.ts';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    // Aceita /rota e /rota/ sem 404 (especialmente no dev).
    // Canonical/sitemap continuam padronizando com barra final via utils/read-site-settings.ts
    trailingSlash: 'ignore',
    adapter: vercel(),
    /** CSS inline no HTML → menos pedidos bloqueantes no caminho crítico (Lighthouse / LCP). */
    build: {
        inlineStylesheets: 'always',
    },
    /** Links go.hotmart.com dos posts ganham src=blog-<slug> no build (rastreio de venda por página). */
    markdown: {
        rehypePlugins: [rehypeHotmartSrc],
    },
    integrations: [
        react({
            // classic evita erro "jsxDEV is not a function" com client:only em dev
            jsxRuntime: 'classic',
        }),
        tailwind(), 
        markdoc({ allowHTML: true })
    ],
    // O redirect de /blog/ferramentas-tecnico-ar-condicionado agora vive em src/middleware.ts,
    // que roda antes das rotas de redirect do Astro e por isso é o único lugar onde a regra
    // pode interceptar a requisição antes da regra genérica /blog/slug → /slug.
    // Reset Trigger: 2026-02-07 11:40
});
