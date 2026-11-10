/**
 * blog-permalink.ts
 *
 * Utilitários para gerar e interpretar URLs de posts do blog.
 * Suporta estruturas configuráveis em Configurações > SEO:
 *   - postname, year_month, year_month_day
 *   - Prefixo: /blog ou raiz (sem /blog)
 */

export type BlogPermalinkStructure = 'postname' | 'year_month' | 'year_month_day';
export type BlogUrlPrefix = 'blog' | 'root';

export interface PostForPermalink {
    id?: string;
    data: {
        slug: string;
        publishedDate?: string;
    };
}

/**
 * Gera o path do post (sem /blog) baseado na estrutura configurada.
 * Ex: "slug" | "2025/03/slug" | "2025/03/04/slug"
 */
export function buildPostPath(
    post: PostForPermalink,
    structure: BlogPermalinkStructure = 'postname'
): string {
    const slug = post.data.slug || post.id || '';
    if (!slug) return '';

    if (structure === 'postname') {
        return slug;
    }

    const dateStr = post.data.publishedDate;
    if (!dateStr) return slug; // fallback se sem data

    let date: Date;
    try {
        date = new Date(dateStr);
    } catch {
        return slug;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (structure === 'year_month') {
        return `${year}/${month}/${slug}`;
    }
    // year_month_day
    return `${year}/${month}/${day}/${slug}`;
}

/**
 * Retorna a URL completa do post.
 * @param prefix 'blog' = /blog/path, 'root' = /path
 */
export function getPostUrl(
    post: PostForPermalink,
    structure: BlogPermalinkStructure = 'postname',
    prefix: BlogUrlPrefix = 'blog'
): string {
    const path = buildPostPath(post, structure);
    if (!path) return prefix === 'blog' ? '/blog' : '/';
    return prefix === 'root' ? `/${path}` : `/blog/${path}`;
}

/**
 * Extrai o slug do post a partir do path recebido.
 * Ex: "2025/03/04/slug-do-post" → "slug-do-post"
 *     "slug-do-post" → "slug-do-post"
 */
export function parsePostSlugFromPath(pathSlug: string): string {
    if (!pathSlug || typeof pathSlug !== 'string') return '';
    const parts = pathSlug.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}
