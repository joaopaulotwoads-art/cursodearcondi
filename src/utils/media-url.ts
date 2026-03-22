/**
 * URLs de media do legado Ghost (bemmae.com.br) e do CMS atual.
 * - apex → www, http → https
 * - Caminhos /content/images/... passam a ser relativos ao site, servidos por public/content/images/...
 */

export function alignThumbnailHost(url: string | undefined | null): string {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    u = u.replace(/^http:\/\/(www\.)?bemmae\.com\.br\//i, 'https://www.bemmae.com.br/');
    u = u.replace(/^https:\/\/bemmae\.com\.br\//i, 'https://www.bemmae.com.br/');
    return u;
}

/**
 * Para imagens hospedadas neste site: reescreve para /content/images/...
 * (coloque os ficheiros em public/content/images/... no repo).
 * Outras URLs (Unsplash, etc.) mantém absolutas normalizadas.
 */
export function resolveBemmaeMediaUrl(url: string | undefined | null): string {
    const aligned = alignThumbnailHost(url);
    if (!aligned) return '';
    const m = aligned.match(/^https:\/\/www\.bemmae\.com\.br\/(content\/images\/.+)$/i);
    if (m) return '/' + m[1];
    return aligned;
}

/** Substitui URLs absolutas do Ghost no HTML do post por caminhos relativos /content/images/... */
export function rewriteBemmaeContentImagesInHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html.replace(
        /https?:\/\/(?:www\.)?bemmae\.com\.br(\/content\/images\/[^"'<>\s]+)/gi,
        '$1',
    );
}
