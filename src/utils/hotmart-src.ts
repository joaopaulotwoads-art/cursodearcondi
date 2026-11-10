/**
 * Acrescenta `src=<slug da página>` nos links go.hotmart.com, para o relatório de vendas
 * da Hotmart mostrar de qual página veio cada venda. Roda no build/SSR, nunca no navegador.
 */

const HOTMART_SRC_HOST = 'go.hotmart.com';

/** Normaliza o slug para o formato aceito pelo parâmetro src (letras, números, - e _). */
function normalizeSrc(src: string): string {
  return src
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Retorna o link com `src` definido, preservando os parâmetros existentes. Outros hosts passam intactos. */
export function withHotmartSrc(href: string, src: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (url.hostname !== HOTMART_SRC_HOST) return href;
  const value = normalizeSrc(src);
  if (!value) return href;
  url.searchParams.set('src', value);
  return url.toString();
}

/** src padrão de post do blog: blog-<slug>. */
export function blogHotmartSrc(slug: string): string {
  return `blog-${slug}`;
}

/** Reescreve os href de go.hotmart.com dentro de um HTML já renderizado (posts em contentFormat html). */
export function rewriteHotmartLinksInHtml(html: string, src: string): string {
  return html.replace(/href=(["'])(https?:\/\/go\.hotmart\.com[^"']*)\1/gi, (_m, q: string, href: string) => {
    const decoded = href.replace(/&amp;/g, '&');
    return `href=${q}${withHotmartSrc(decoded, src).replace(/&/g, '&amp;')}${q}`;
  });
}

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type AstroVFile = {
  path?: string;
  history?: string[];
  data?: { astro?: { frontmatter?: Record<string, unknown> } };
};

/** Plugin rehype para posts markdown: usa o `slug` do frontmatter (ou o nome do arquivo). */
export function rehypeHotmartSrc() {
  return (tree: HastNode, file: AstroVFile) => {
    const fmSlug = file.data?.astro?.frontmatter?.slug;
    const filePath = file.path || file.history?.[0] || '';
    const fileSlug = filePath.split(/[\\/]/).pop()?.replace(/\.(md|mdx|mdoc)$/i, '') || '';
    const slug = typeof fmSlug === 'string' && fmSlug.trim() ? fmSlug.trim() : fileSlug;
    if (!slug) return;
    const src = blogHotmartSrc(slug);

    const walk = (node: HastNode) => {
      if (node.type === 'element' && node.tagName === 'a' && typeof node.properties?.href === 'string') {
        node.properties.href = withHotmartSrc(node.properties.href, src);
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
