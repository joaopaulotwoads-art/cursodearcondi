/**
 * sitemap-index.xml.ts
 *
 * Rota SSR que gera o sitemap XML dinamicamente.
 * Inclui: páginas estáticas, posts, autores e páginas locais (location × service).
 * Lê configurações em settings.yaml (generateSitemap, canonicalUrl).
 * Configurável no Admin → Configurações → SEO Técnico.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readSiteSettings } from '../utils/read-site-settings';
import { listLocations } from '../utils/location-utils';
import { listServices } from '../utils/service-utils';
import { getPostUrl, type BlogPermalinkStructure, type BlogUrlPrefix } from '../utils/blog-permalink';

function esc(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlNode(base: string, path: string, lastmod?: string): string {
    const full = base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    const loc = esc(full);
    const lm = lastmod ? `\n    <lastmod>${esc(lastmod)}</lastmod>` : '';
    return `  <url>
    <loc>${loc}</loc>${lm}
  </url>`;
}

export const GET: APIRoute = async ({ request }) => {
    const settings = await readSiteSettings();
    const generate = settings.generateSitemap !== false;
    const siteMode = (settings.siteMode as string) || 'blog';
    let base = (settings.canonicalUrl as string)?.trim();
    if (!base) {
        try {
            const url = new URL(request.url);
            base = `${url.protocol}//${url.host}`;
        } catch {
            base = 'https://example.com';
        }
    }

    const stylesheet = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>';
    if (!generate) {
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
${stylesheet}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlNode(base, '/')}
</urlset>`,
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8',
                    'Cache-Control': 'public, max-age=3600',
                },
            },
        );
    }

    const today = new Date().toISOString().slice(0, 10);
    const urls: string[] = [];

    // Páginas estáticas
    const staticPaths = ['/', '/blog', '/servicos', '/contato', '/sobre', '/lp1', '/curso-vendas'];
    for (const p of staticPaths) {
        urls.push(urlNode(base, p, today));
    }

    // Posts
    try {
        const posts = await getCollection('posts');
        const permalinkStructure = (settings.blogPermalinkStructure as BlogPermalinkStructure) || 'postname';
        const urlPrefix = (settings.blogUrlPrefix as BlogUrlPrefix) || 'blog';
        for (const post of posts) {
            const postPath = getPostUrl({ ...post, data: { ...post.data, slug: post.data.slug || post.id } }, permalinkStructure, urlPrefix);
            urls.push(urlNode(base, postPath, post.data.publishedDate as string || today));
        }
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao coletar posts para sitemap:\x1b[0m', e);
    }

    // Autores
    try {
        const authors = await getCollection('authors');
        for (const author of authors) {
            urls.push(urlNode(base, `/authors/${author.id}`, today));
        }
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao coletar autores para sitemap:\x1b[0m', e);
    }

    // Páginas locais: [location]/[service] - apenas no modo local
    if (siteMode === 'local') {
        try {
            const [locations, services] = await Promise.all([listLocations(), listServices()]);
            const activeServices = services.filter(s => s.data.active !== false);
            const validLocations = locations.filter(
                l => l.data.active || l.data.type === 'cidade',
            );

            if (validLocations.length > 0 && activeServices.length > 0) {
                for (const loc of validLocations) {
                    for (const svc of activeServices) {
                        urls.push(urlNode(base, `/${loc.data.slug}/${svc.data.slug}`, today));
                    }
                }
            } else if (activeServices.length > 0) {
                for (const svc of activeServices) {
                    urls.push(urlNode(base, `/servicos/${svc.data.slug}`, today));
                }
            }
        } catch (e) {
            console.error('\x1b[31m✗ Erro ao coletar páginas locais para sitemap:\x1b[0m', e);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
${stylesheet}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
