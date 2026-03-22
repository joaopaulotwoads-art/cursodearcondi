/**
 * Normaliza URLs de imagens do CMS legado (apex → www, http → https) para coincidir com o domínio canónico.
 */
export function alignThumbnailHost(url: string | undefined | null): string {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    u = u.replace(/^http:\/\/(www\.)?bemmae\.com\.br\//i, 'https://www.bemmae.com.br/');
    u = u.replace(/^https:\/\/bemmae\.com\.br\//i, 'https://www.bemmae.com.br/');
    return u;
}
