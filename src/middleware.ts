import { defineMiddleware } from 'astro:middleware';
import {
    readSiteSettings,
    canonicalPathname,
    shouldRedirectAddTrailingSlash,
    shouldRedirectAddTrailingSlashApi,
} from './utils/read-site-settings';

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname, searchParams, hostname, href } = context.url;

    // 301: www → apex (sem www), alinhado ao domínio principal na Vercel e às meta tags canônicas
    if (hostname.startsWith('www.')) {
        const h = hostname.toLowerCase();
        if (h !== 'www.localhost' && !h.endsWith('.local')) {
            const dest = new URL(href);
            dest.hostname = hostname.slice(4);
            return context.redirect(dest.toString(), 301);
        }
    }

    // 308: /api/rota → /api/rota/ (Astro trailingSlash: 'always'). Preserva método em fetch com body.
    if (shouldRedirectAddTrailingSlashApi(pathname)) {
        const u = new URL(context.url.href);
        u.pathname = canonicalPathname(pathname);
        return context.redirect(u.toString(), 308);
    }

    // Modo blog: /servicos → home em um passo (antes de forçar barra em /servicos/)
    if (pathname === '/servicos' || pathname.startsWith('/servicos/')) {
        try {
            const settings = await readSiteSettings();
            if ((settings.siteMode || 'blog') !== 'local') {
                return context.redirect('/', 301);
            }
        } catch {
            /* continua */
        }
    }

    // 301: /rota → /rota/ (páginas). Canonical e sitemap com barra final.
    // Alguns clientes fazem HEAD antes de GET, entao tratamos os dois.
    const method = context.request.method;
    if ((method === 'GET' || method === 'HEAD') && shouldRedirectAddTrailingSlash(pathname)) {
        const u = new URL(context.url.href);
        u.pathname = canonicalPathname(pathname);
        return context.redirect(u.toString(), 301);
    }

    // 301: /blog?categoria=slug → /slug/ (URLs antigas da listagem por categoria na raiz)
    const isBlogIndex = pathname === '/blog' || pathname === '/blog/';
    if (isBlogIndex && searchParams.has('categoria')) {
        try {
            const settings = await readSiteSettings();
            if (settings.blogUrlPrefix === 'root') {
                const slug = (searchParams.get('categoria') || '').trim();
                if (slug && !slug.includes('/')) {
                    const u = new URL(context.url.href);
                    u.pathname = canonicalPathname(`/${encodeURIComponent(slug)}`);
                    return context.redirect(u.toString(), 301);
                }
            }
        } catch {
            /* continua */
        }
    }

    // 301: /blog/slug/... → /slug/... (links antigos e Google) quando posts estão na raiz
    if (pathname.startsWith('/blog/') && pathname.length > '/blog/'.length) {
        try {
            const settings = await readSiteSettings();
            if (settings.blogUrlPrefix === 'root') {
                const target = pathname.replace(/^\/blog/, '') || '/';
                const u = new URL(context.url.href);
                u.pathname = canonicalPathname(target);
                return context.redirect(u.toString(), 301);
            }
        } catch {
            /* continua */
        }
    }

    return next();
});
