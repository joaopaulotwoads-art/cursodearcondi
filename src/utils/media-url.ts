/**
 * URLs de media do legado Ghost (cursodear.com.br) e do CMS atual.
 * - www ou apex → https://cursodear.com.br (canônico = apex, igual Vercel)
 * - Caminhos /content/images/... passam a ser relativos ao site, servidos por public/content/images/...
 */


export function alignThumbnailHost(url: string | undefined | null): string {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    u = u.replace(/^http:\/\/(www\.)?cursodear\.com\.br\//i, 'https://cursodear.com.br/');
    u = u.replace(/^https:\/\/www\.cursodear\.com\.br\//i, 'https://cursodear.com.br/');
    return u;
}

/**
 * Para imagens hospedadas neste site: reescreve para /content/images/...
 * (coloque os ficheiros em public/content/images/... no repo).
 * Outras URLs (Unsplash, etc.) mantém absolutas normalizadas.
 */
export function resolvecursodearMediaUrl(url: string | undefined | null): string {
    const aligned = alignThumbnailHost(url);
    if (!aligned) return '';
    const m = aligned.match(/^https:\/\/cursodear\.com\.br\/(content\/images\/.+)$/i);
    if (m) return '/' + m[1];
    return aligned;
}
