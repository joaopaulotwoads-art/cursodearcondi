/**
 * /sitemap-index.xml: páginas fixas + todos os posts (gerado no build).
 * Páginas novas em src/pages/ precisam entrar em STATIC_PATHS.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../data/site';
import { postSlug } from '../utils/post-url';

const STATIC_PATHS = ['/', '/blog/', '/cursos/', '/automotivo/', '/contato/', '/sobre/'];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const urlNode = (path: string, lastmod: string) => `  <url>
    <loc>${esc(SITE.url + path)}</loc>
    <lastmod>${esc(lastmod)}</lastmod>
  </url>`;

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = STATIC_PATHS.map((p) => urlNode(p, today));
  for (const post of await getCollection('posts')) {
    urls.push(urlNode(`/${postSlug(post)}/`, post.data.publishedDate || today));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
