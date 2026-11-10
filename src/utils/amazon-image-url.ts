/**
 * Redimensiona URLs de imagem de produto da Amazon (m.media-amazon.com/images/I/...).
 * Os ficheiros SL… e SX… costumam ser enormes para thumbnails em cards; _AC_UL{w}_ limita a aresta maior.
 */

const AMAZON_I_PATH = /\/\/m\.media-amazon\.com\/images\/I\//i;
const AMAZON_I_PATH_LEGACY = /\/\/images-na\.ssl-images-amazon\.com\/images\/I\//i;

export function isAmazonProductImageUrl(url: string): boolean {
    const u = url.trim();
    return AMAZON_I_PATH.test(u) || AMAZON_I_PATH_LEGACY.test(u);
}

/**
 * @param maxEdge aresta maior em px (320 cobre bem ~100–200px no ecrã em 2x)
 */
export function shrinkAmazonProductImageUrl(url: string, maxEdge = 320): string {
    const u = url.trim();
    if (!isAmazonProductImageUrl(u)) return url;
    const cap = Math.min(Math.max(maxEdge, 160), 500);
    const ul = `_AC_UL${cap}_`;
    let s = u;
    s = s.replace(/_AC_SY\d+_SX\d+_QL\d+_ML\d+_/gi, ul);
    s = s.replace(/_AC_SL\d+_/gi, ul);
    s = s.replace(/_AC_SX\d+_/gi, ul);
    s = s.replace(/_AC_SY\d+_/gi, ul);
    return s;
}

/** Reescreve todos os src/href de imagens Amazon no HTML do post. */
export function shrinkAmazonImagesInHtml(html: string): string {
    if (!html.includes('media-amazon.com') && !html.includes('ssl-images-amazon.com')) return html;
    return html.replace(
        /https?:\/\/(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)\/images\/I\/[^"'<>\s]+/gi,
        (m) => shrinkAmazonProductImageUrl(m),
    );
}
