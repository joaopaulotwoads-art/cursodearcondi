/**
 * Índice do artigo (review roundup): extrai h2 do HTML, injeta ids para âncoras
 * e ignora títulos dentro da caixa de produto (.cnx-aff-product-title).
 */

function stripInnerHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasProductTitleClass(attrs: string): boolean {
  return /class\s*=\s*["'][^"']*\bcnx-aff-product-title\b/.test(attrs);
}

export type ReviewTocItem = { id: string; text: string };

/**
 * Injeta `id` em cada `<h2>` relevante e devolve a lista para o índice.
 */
/**
 * Divide o HTML após o fechamento de `<section class="review-hero-picks">`.
 * Se não existir "Em destaque", `head` fica vazio e `tail` é o HTML completo.
 */
export function splitHtmlAfterReviewHeroPicks(html: string): { head: string; tail: string } {
  const marker = '<section class="review-hero-picks"';
  const start = html.indexOf(marker);
  if (start === -1) {
    return { head: '', tail: html };
  }
  const fromSection = html.slice(start);
  const closeIdx = fromSection.indexOf('</section>');
  if (closeIdx === -1) {
    return { head: '', tail: html };
  }
  const end = start + closeIdx + '</section>'.length;
  const head = html.slice(0, end);
  const tail = html.slice(end).replace(/^\s*\n?/, '');
  return { head, tail };
}

export function injectH2IdsAndBuildToc(html: string): { html: string; toc: ReviewTocItem[] } {
  const toc: ReviewTocItem[] = [];
  let seq = 0;

  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (full, attrs = '', inner) => {
    const a = attrs as string;
    if (hasProductTitleClass(a)) {
      return full;
    }

    const text = stripInnerHtml(inner);
    if (!text) {
      return full;
    }

    const idMatch = a.match(/\bid\s*=\s*["']([^"']+)["']/i);
    let id: string;
    if (idMatch) {
      id = idMatch[1];
    } else {
      id = `review-toc-${seq++}`;
    }

    toc.push({ id, text });

    if (idMatch) {
      return full;
    }

    return `<h2${a} id="${id}">${inner}</h2>`;
  });

  return { html: out, toc };
}
