/**
 * Gera o corpo HTTP do sitemap em /sitemap-index.xml (padrão Astro).
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readSiteSettings, normalizeCanonicalUrl, stripWwwFromOrigin, canonicalPathname } from './read-site-settings';
import { listLocations } from './location-utils';
import { listServices } from './service-utils';
import {
    buildPostPath,
    getPostUrl,
    type BlogPermalinkStructure,
    type BlogUrlPrefix,
} from './blog-permalink';

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

/** Handler GET da rota sitemap-index.xml */
export const getSitemapXmlResponse: APIRoute = async ({ request }) => {
    const settings = await readSiteSettings();
    const generate = settings.generateSitemap !== false;
    const siteMode = (settings.siteMode as string) || 'blog';
    let base = normalizeCanonicalUrl(settings.canonicalUrl as string | undefined);
    if (!base) {
        try {
            base = stripWwwFromOrigin(new URL(request.url).origin);
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

    const staticPaths = [
        '/',
        '/blog',
        ...(siteMode === 'local' ? ['/servicos'] : []),
        '/contato',
        '/sobre',
        '/termos',
        '/politica-de-cookies',
    ];
    for (const p of staticPaths) {
        urls.push(urlNode(base, canonicalPathname(p), today));
    }

    /** Mesmas URLs que contato.astro / sobre.astro — não duplicar no sitemap como post. */
    const slugReservedForStaticPages = new Set(['sobre', 'contato']);

    try {
        const posts = await getCollection('posts');
        const permalinkStructure = (settings.blogPermalinkStructure as BlogPermalinkStructure) || 'postname';
        const urlPrefix = (settings.blogUrlPrefix as BlogUrlPrefix) || 'blog';
        for (const post of posts) {
            const postSlug = post.data.slug || post.id;
            if (urlPrefix === 'root' && slugReservedForStaticPages.has(postSlug)) {
                continue;
            }
            const postPath = getPostUrl({ ...post, data: { ...post.data, slug: postSlug } }, permalinkStructure, urlPrefix);
            urls.push(urlNode(base, canonicalPathname(postPath), post.data.publishedDate as string || today));
        }

        if (urlPrefix === 'root') {
            const reservedTopLevel = new Set([
                'sobre',
                'contato',
                'blog',
                'admin',
                'authors',
                'api',
                'termos',
                'politica-de-cookies',
                'servicos',
                'lp1',
                'curso-vendas',
                'nossos-cursos',
                'automotivo',
                'setup',
            ]);
            const postSlugSet = new Set(
                posts
                    .filter((p) => !slugReservedForStaticPages.has(p.data.slug || p.id))
                    .map((p) =>
                        buildPostPath(
                            { ...p, data: { ...p.data, slug: p.data.slug || p.id } },
                            permalinkStructure,
                        ),
                    ),
            );
            const categories = await getCollection('categories');
            for (const cat of categories) {
                const id = cat.id;
                if (!id || id.includes('/')) continue;
                if (postSlugSet.has(id)) continue;
                if (slugReservedForStaticPages.has(id)) continue;
                if (reservedTopLevel.has(id)) continue;
                urls.push(urlNode(base, canonicalPathname(`/${id}`), today));
            }
        }
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao coletar posts para sitemap:\x1b[0m', e);
    }

    try {
        const authors = await getCollection('authors');
        for (const author of authors) {
            urls.push(urlNode(base, canonicalPathname(`/authors/${author.id}`), today));
        }
    } catch (e) {
        console.error('\x1b[31m✗ Erro ao coletar autores para sitemap:\x1b[0m', e);
    }

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
                        urls.push(urlNode(base, canonicalPathname(`/${loc.data.slug}/${svc.data.slug}`), today));
                    }
                }
            } else if (activeServices.length > 0) {
                for (const svc of activeServices) {
                    urls.push(urlNode(base, canonicalPathname(`/servicos/${svc.data.slug}`), today));
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
