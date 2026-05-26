/**
 * Índice de conteúdo para posts em Markdown: extrai h2/h3 e gera ids de âncora.
 */

export type PostTocItem = { id: string; text: string; level: 2 | 3 };

function cleanHeadingText(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`/g, '')
    .trim();
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueId(base: string, used: Map<string, number>): string {
  const slug = slugify(base) || 'secao';
  const count = used.get(slug) ?? 0;
  used.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

/** Mínimo de entradas para exibir o índice. */
export const POST_TOC_MIN_ITEMS = 2;

/**
 * Extrai `##` e `###` do markdown (ignora blocos de código).
 */
export function buildMarkdownToc(markdown: string): PostTocItem[] {
  const toc: PostTocItem[] = [];
  const usedIds = new Map<string, number>();
  let inCode = false;

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h2) {
      const text = cleanHeadingText(h2[1]);
      if (text) toc.push({ id: uniqueId(text, usedIds), text, level: 2 });
    } else if (h3) {
      const text = cleanHeadingText(h3[1]);
      if (text) toc.push({ id: uniqueId(text, usedIds), text, level: 3 });
    }
  }

  return toc;
}
