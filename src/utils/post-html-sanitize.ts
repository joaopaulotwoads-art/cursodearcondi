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
