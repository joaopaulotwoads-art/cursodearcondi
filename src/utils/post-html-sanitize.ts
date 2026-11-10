/**
 * HTML de posts: o &lt;h1&gt; oficial é o título no layout (BlogPost.astro).
 * Corpos vindos do editor ou importação costumam repetir &lt;h1&gt; no conteúdo — converte para &lt;h2&gt;.
 */
export function demoteBodyH1ToH2(html: string): string {
    if (!html || typeof html !== 'string') return html;
    return html
        .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
        .replace(/<\/h1>/gi, '</h2>');
}

/**
 * Título dentro da caixa de produto não deve ser &lt;h2&gt; (hierarquia do artigo / SEO).
 * Converte &lt;h2 class="cnx-aff-product-title"&gt; → &lt;div&gt; mantendo atributos e conteúdo.
 */
export function replaceProductBoxTitleH2WithDiv(html: string): string {
    if (!html || typeof html !== 'string' || !html.includes('cnx-aff-product-title')) {
        return html;
    }
    return html.replace(
        /<h2\s+([^>]*\bcnx-aff-product-title\b[^>]*)>([\s\S]*?)<\/h2>/gi,
        '<div $1>$2</div>',
    );
}
