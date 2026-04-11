import type { CollectionEntry } from 'astro:content';

function postKey(p: CollectionEntry<'posts'>): string {
  return p.data.slug || p.id;
}

/**
 * Sugere posts relacionados: mesma categoria (se existir), senão os mais recentes.
 * Exclui o post atual e só entradas com data de publicação.
 */
export function pickRelatedPosts(
  post: CollectionEntry<'posts'>,
  allPosts: CollectionEntry<'posts'>[],
  limit = 3,
): CollectionEntry<'posts'>[] {
  const current = postKey(post);
  const published = allPosts.filter((p) => p.data.publishedDate);
  const others = published.filter((p) => postKey(p) !== current);
  const sameCat =
    post.data.category != null && post.data.category !== ''
      ? others.filter((p) => p.data.category === post.data.category)
      : [];
  const pool = sameCat.length > 0 ? sameCat : others;
  return pool
    .sort(
      (a, b) =>
        new Date(b.data.publishedDate!).getTime() - new Date(a.data.publishedDate!).getTime(),
    )
    .slice(0, limit);
}
