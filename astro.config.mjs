// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { rehypeHotmartSrc } from './src/utils/hotmart-src.ts';

// https://astro.build/config
export default defineConfig({
    site: 'https://cursodearcondicionado.com.br',
    /** Site 100% estático: o build gera dist/, servido como static assets por um Cloudflare Worker (wrangler.jsonc). */
    output: 'static',
    // Aceita /rota e /rota/ no dev. Em produção, /rota -> /rota/ com 301 via dist/_redirects (scripts/build-redirects.mjs).
    trailingSlash: 'ignore',
    /** CSS inline no HTML → menos pedidos bloqueantes no caminho crítico (Lighthouse / LCP). */
    build: {
        inlineStylesheets: 'always',
    },
    /** Links go.hotmart.com dos posts ganham src=blog-<slug> no build (rastreio de venda por página). */
    markdown: {
        rehypePlugins: [rehypeHotmartSrc],
    },
    integrations: [tailwind()],
});
