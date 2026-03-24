/**
 * JSON-LD para posts (BlogPosting, Article + ItemList em reviews/listas).
 */

export type PostSeoSchema = 'auto' | 'blogPosting' | 'articleItemList' | 'none';

const BEMMAE_CARD_H3 =
    /<div[^>]*class="[^"]*\bbemmae-card\b[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*\bbemmae-text\b[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;

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

/** URL absoluta da página do autor (mesmo padrão que `/authors/${author.id}` nas rotas). */
export function buildAuthorAbsoluteUrl(siteOrigin: string, authorId: string): string {
    const base = siteOrigin.replace(/\/+$/, '');
    const seg = authorId.split('/').map(encodeURIComponent).join('/');
    return `${base}/authors/${seg}`;
}

function personAuthor(name: string, url?: string): Record<string, unknown> {
    return {
        '@type': 'Person',
        name,
        ...(url ? { url } : {}),
    };
}

function blogPostingBlock(opts: {
    title: string;
    description: string;
    pageUrl: string;
    siteUrl: string;
    siteName: string;
    publishedDate?: string;
    imageUrl?: string;
    authorName?: string;
    authorUrl?: string;
}): Record<string, unknown> {
    const iso = toIsoDateTime(opts.publishedDate);
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: opts.title,
        description: opts.description || undefined,
        image: opts.imageUrl ? [opts.imageUrl] : undefined,
        datePublished: iso,
        dateModified: iso,
        author: opts.authorName ? personAuthor(opts.authorName, opts.authorUrl) : undefined,
        publisher: {
            '@type': 'Organization',
            name: opts.siteName,
            url: opts.siteUrl,
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': opts.pageUrl,
        },
    };
}

function articleItemListBlock(
    opts: {
        title: string;
        description: string;
        pageUrl: string;
        siteUrl: string;
        siteName: string;
        publishedDate?: string;
        imageUrl?: string;
        authorName?: string;
        authorUrl?: string;
    },
    itemNames: string[],
): Record<string, unknown> {
    const iso = toIsoDateTime(opts.publishedDate);
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: opts.title,
        description: opts.description || undefined,
        image: opts.imageUrl ? [opts.imageUrl] : undefined,
        datePublished: iso,
        dateModified: iso,
        author: opts.authorName ? personAuthor(opts.authorName, opts.authorUrl) : undefined,
        publisher: {
            '@type': 'Organization',
            name: opts.siteName,
            url: opts.siteUrl,
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': opts.pageUrl,
        },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: itemNames.length,
            itemListElement: itemNames.map((name, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name,
            })),
        },
    };
}

export function buildPostJsonLd(opts: {
    seoSchema?: PostSeoSchema;
    title: string;
    description: string;
    pageUrl: string;
    siteUrl: string;
    siteName: string;
    publishedDate?: string;
    imageUrl?: string;
    authorName?: string;
    authorUrl?: string;
    htmlContent?: string | null;
}): Record<string, unknown> | null {
    let mode: PostSeoSchema = opts.seoSchema || 'auto';
    const items = extractBemmaeRankedProductNames(opts.htmlContent);

    if (mode === 'auto') {
        mode = items.length >= 2 ? 'articleItemList' : 'blogPosting';
    }
    if (mode === 'none') return null;

    const base = {
        title: opts.title,
        description: opts.description,
        pageUrl: opts.pageUrl,
        siteUrl: opts.siteUrl,
        siteName: opts.siteName,
        publishedDate: opts.publishedDate,
        imageUrl: opts.imageUrl,
        authorName: opts.authorName,
        authorUrl: opts.authorUrl,
    };

    if (mode === 'articleItemList') {
        if (items.length >= 2) return articleItemListBlock(base, items);
        return blogPostingBlock(base);
    }
    return blogPostingBlock(base);
}
