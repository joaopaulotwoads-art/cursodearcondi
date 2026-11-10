/** Posts ficam na raiz do site: /<slug> (o slug vem do frontmatter, ou do nome do arquivo). */

interface PostLike {
  id: string;
  data: { slug?: string };
}

export function postSlug(post: PostLike): string {
  return post.data.slug || post.id;
}

export function postUrl(post: PostLike): string {
  return `/${postSlug(post)}`;
}

interface DatedPost {
  id: string;
  data: { publishedDate?: string; date?: string };
}

/** Ordem das listagens: mais recente primeiro; na mesma data, pelo nome do arquivo (A-Z). */
export function newestFirst(a: DatedPost, b: DatedPost): number {
  const da = new Date((a.data.publishedDate || a.data.date) as string).getTime();
  const db = new Date((b.data.publishedDate || b.data.date) as string).getTime();
  return db - da || a.id.localeCompare(b.id);
}
