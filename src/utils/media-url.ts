/**
 * Normaliza URLs de imagens do CMS legado (apex → www) para coincidir com o domínio canónico.
 */
export function alignThumbnailHost(url: string | undefined | null): string {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/^https:\/\/bemmae\.com\.br\//i, 'https://www.bemmae.com.br/');
}
