/**
 * Resolve um único segmento de URL na raiz (posts na raiz ou categoria),
 * com as mesmas regras que getStaticPaths em [...slug].astro.
 * Usado quando src/pages/[location]/index.astro intercepta a URL e faz rewrite.
 */

import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { buildPostPath, type BlogPermalinkStructure } from './blog-permalink';

const RESERVED_TOP = new Set([
  'sobre',
  'contato',
  'blog',
  'admin',
  'authors',
  'api',
  'termos',
  'politica-de-cookies',
  'servicos',
  'lp1',
  'curso-vendas',
  'setup',
  'cnx-blog-resolve',
]);

const SLUG_RESERVED_STATIC = new Set(['sobre', 'contato']);

export type BlogRootResolution =
  | { kind: 'post'; post: CollectionEntry<'posts'> }
  | { kind: 'category'; category: CollectionEntry<'categories'> }
  | { kind: 'notfound' };

export async function resolveBlogRootSegment(slug: string | undefined): Promise<BlogRootResolution> {
  if (!slug || slug.includes('/')) return { kind: 'notfound' };

  const settings = await getEntry('siteSettings', 'settings').catch(() => null);
  if ((settings?.data?.blogUrlPrefix as string) !== 'root') return { kind: 'notfound' };

  if (RESERVED_TOP.has(slug) || SLUG_RESERVED_STATIC.has(slug)) return { kind: 'notfound' };

  const structure = (settings?.data?.blogPermalinkStructure as BlogPermalinkStructure) || 'postname';
  const posts = await getCollection('posts');

  const postPaths = posts
    .filter((post) => !SLUG_RESERVED_STATIC.has(post.data.slug || post.id))
    .map((post) => ({
      path: buildPostPath({ ...post, data: { ...post.data, slug: post.data.slug || post.id } }, structure),
      post,
    }));

  const hitPost = postPaths.find((p) => p.path === slug);
  if (hitPost) return { kind: 'post', post: hitPost.post };

  const postSlugSet = new Set(postPaths.map((p) => p.path));

  const categories = await getCollection('categories');
  for (const category of categories) {
    const id = category.id;
    if (!id || id.includes('/')) continue;
    if (postSlugSet.has(id)) continue;
    if (SLUG_RESERVED_STATIC.has(id)) continue;
    if (RESERVED_TOP.has(id)) continue;
    if (id === slug) return { kind: 'category', category };
  }

  return { kind: 'notfound' };
}
