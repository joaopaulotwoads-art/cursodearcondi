/**
 * JSON-LD para posts: @graph com #website, #organization, #author, ImageObject, SearchAction, BreadcrumbList.
 */

import { canonicalPathname, schemaPageUrl } from './read-site-settings';

export type PostSeoSchema = 'auto' | 'blogPosting' | 'articleItemList' | 'none';

const BEMMAE_CARD_H3 =
    /<div[^>]*class="[^"]*\bbemmae-card\b[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*\bbemmae-text\b[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;

const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

export function extractBemmaeRankedProductNames(html: string | null | undefined): string[] {
    if (!html) return [];
    const names: string[] = [];
    for (const m of html.matchAll(BEMMAE_CARD_H3)) {
        const name = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (name && !/^ficha t[eé]cnica/i.test(name)) names.push(name);
    }
    return names;
}

export function toAbsoluteUrl(siteOrigin: string, img?: string | null): string | undefined {
    if (!img?.trim()) return undefined;
    const t = img.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    const base = siteOrigin.replace(/\/+$/, '');
    if (t.startsWith('/')) return `${base}${t}`;
    return `${base}/${t}`;
}

export function toIsoDateTime(dateStr?: string | null): string | undefined {
    if (!dateStr?.trim()) return undefined;
    const d = dateStr.trim();
    if (d.includes('T')) return d;
    return `${d}T12:00:00.000Z`;
}

export function buildAuthorAbsoluteUrl(siteOrigin: string, authorId: string): string {
    const base = siteOrigin.replace(/\/+$/, '');
    const seg = authorId.split('/').map(encodeURIComponent).join('/');
    return `${base}/authors/${seg}`;
}

function siteRootOnly(siteUrl: string): string {
    return siteUrl.replace(/\/+$/, '');
}

/** IDs absolutos com fragmento (ex.: https://domínio/#website). */
function idFragment(siteRoot: string, fragment: string): string {
    return `${siteRoot}/#${fragment}`;
}

function idPage(pageUrl: string, fragment: string): string {
    const base = pageUrl.replace(/\/+$/, '');
    return `${base}#${fragment}`;
}

/** Template de busca interna: listagem do blog com ?q= */
export function buildBlogSearchUrlTemplate(siteUrl: string): string {
    const root = siteRootOnly(siteUrl);
    const blogPath = canonicalPathname('/blog');
    return `${root}${blogPath}?q={search_term_string}`;
}

/**
 * Graph mínimo (home, listagens): WebSite + Organization + SearchAction + inLanguage.
 */
export function buildBemmaeDefaultSiteJsonLd(opts: {
    siteUrl: string;
    siteName: string;
    description?: string;
}): Record<string, unknown> {
    const root = siteRootOnly(opts.siteUrl);
    const webSiteId = idFragment(root, 'website');
    const orgId = idFragment(root, 'organization');

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': orgId,
                name: opts.siteName,
                url: schemaPageUrl(`${root}/`),
            },
            {
                '@type': 'WebSite',
                '@id': webSiteId,
                name: opts.siteName,
                url: schemaPageUrl(`${root}/`),
                description: opts.description || undefined,
                inLanguage: 'pt-BR',
                publisher: { '@id': orgId },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: schemaPageUrl(buildBlogSearchUrlTemplate(opts.siteUrl)),
                    },
                    'query-input': 'required name=search_term_string',
                },
            },
        ],
    };
}

function personNode(name: string, authorPageUrl: string): Record<string, unknown> {
    const base = authorPageUrl.replace(/\/+$/, '');
    return {
        '@type': 'Person',
        '@id': `${base}#author`,
        name,
        url: schemaPageUrl(`${base}/`),
    };
}

export function buildPostJsonLd(opts: {
    seoSchema?: PostSeoSchema;
    /** Título do artigo (headline / caption) */
    headline: string;
    description: string;
    pageUrl: string;
    siteUrl: string;
    siteName: string;
    publishedDate?: string;
    imageUrl?: string;
    /** Largura/altura da imagem principal (OG); padrão 1200×630 */
    imageWidth?: number;
    imageHeight?: number;
    authorName?: string;
    authorUrl?: string;
    htmlContent?: string | null;
    /** Categoria do post: nome e path canônico (ex. /carrinhos-de-bebe/) */
    categoryName?: string;
    categoryPath?: string;
}): Record<string, unknown> | null {
    let mode: PostSeoSchema = opts.seoSchema || 'auto';
    const items = extractBemmaeRankedProductNames(opts.htmlContent);

    if (mode === 'auto') {
        mode = items.length >= 2 ? 'articleItemList' : 'blogPosting';
    }
    if (mode === 'none') return null;

    const root = siteRootOnly(opts.siteUrl);
    const webSiteId = idFragment(root, 'website');
    const orgId = idFragment(root, 'organization');
    const pageUrl = schemaPageUrl(opts.pageUrl.trim());
    const iso = toIsoDateTime(opts.publishedDate);
    const imgUrl = opts.imageUrl;
    const w = opts.imageWidth ?? DEFAULT_IMAGE_WIDTH;
    const h = opts.imageHeight ?? DEFAULT_IMAGE_HEIGHT;
    const caption = opts.headline;

    const authorPageUrl = opts.authorUrl ? opts.authorUrl.replace(/\/+$/, '') + '/' : undefined;
    const authorNode =
        opts.authorName && authorPageUrl ? personNode(opts.authorName, authorPageUrl) : null;

    const imageId = idPage(pageUrl, 'primaryimage');
    const webPageId = idPage(pageUrl, 'webpage');
    const articleId = idPage(pageUrl, mode === 'articleItemList' ? 'article' : 'blogposting');
    const breadcrumbId = idPage(pageUrl, 'breadcrumb');

    const imageObject: Record<string, unknown> = {
        '@type': 'ImageObject',
        '@id': imageId,
        url: imgUrl ? schemaPageUrl(imgUrl) : imgUrl,
        width: w,
        height: h,
        caption,
    };

    const blogPath = canonicalPathname('/blog');
    const blogIndexUrl = schemaPageUrl(`${root}${blogPath}`);

    const breadcrumbItems: Record<string, unknown>[] = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: schemaPageUrl(`${root}/`),
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: blogIndexUrl,
        },
    ];
    let pos = 3;
    if (opts.categoryName && opts.categoryPath) {
        const catUrl = schemaPageUrl(`${root}${canonicalPathname(opts.categoryPath)}`);
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: pos++,
            name: opts.categoryName,
            item: catUrl,
        });
    }
    breadcrumbItems.push({
        '@type': 'ListItem',
        position: pos,
        name: opts.headline,
        item: pageUrl,
    });

    const publisherRef = { '@id': orgId };
    const webSiteRef = { '@id': webSiteId };

    const webPage: Record<string, unknown> = {
        '@type': 'WebPage',
        '@id': webPageId,
        url: pageUrl,
        name: opts.headline,
        isPartOf: webSiteRef,
        inLanguage: 'pt-BR',
        ...(imgUrl ? { primaryImageOfPage: { '@id': imageId } } : {}),
    };

    const articleCommon: Record<string, unknown> = {
        headline: opts.headline,
        description: opts.description || undefined,
        url: pageUrl,
        inLanguage: 'pt-BR',
        datePublished: iso,
        dateModified: iso,
        author: authorNode ? { '@id': authorNode['@id'] as string } : undefined,
        publisher: publisherRef,
        isPartOf: webSiteRef,
        mainEntityOfPage: { '@id': webPageId },
        ...(imgUrl
            ? {
                  image: { '@id': imageId },
              }
            : {}),
    };

    let mainEntity: Record<string, unknown>;

    if (mode === 'articleItemList' && items.length >= 2) {
        mainEntity = {
            '@type': 'Article',
            '@id': articleId,
            ...articleCommon,
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: items.length,
                itemListElement: items.map((name, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name,
                })),
            },
        };
    } else {
        mainEntity = {
            '@type': 'BlogPosting',
            '@id': articleId,
            ...articleCommon,
        };
    }

    const graph: Record<string, unknown>[] = [
        {
            '@type': 'Organization',
            '@id': orgId,
            name: opts.siteName,
            url: schemaPageUrl(`${root}/`),
        },
        {
            '@type': 'WebSite',
            '@id': webSiteId,
            name: opts.siteName,
            url: schemaPageUrl(`${root}/`),
            inLanguage: 'pt-BR',
            publisher: { '@id': orgId },
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: schemaPageUrl(buildBlogSearchUrlTemplate(opts.siteUrl)),
                },
                'query-input': 'required name=search_term_string',
            },
        },
        ...(authorNode ? [authorNode] : []),
        ...(imgUrl ? [imageObject] : []),
        webPage,
        mainEntity,
        {
            '@type': 'BreadcrumbList',
            '@id': breadcrumbId,
            itemListElement: breadcrumbItems,
        },
    ];

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}
