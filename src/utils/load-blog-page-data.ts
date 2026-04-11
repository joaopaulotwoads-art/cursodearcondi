/**
 * Dados partilhados entre [...slug].astro e cnx-blog-resolve (rewrite desde [location]).
 */

import { getCollection, getEntry, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { readSingleton } from './singleton-utils';
import { footerNavFromSingleton, logoSrcFromMenu, navFromMenu } from './theme-nav';
import { readPost } from './post-utils';
import type { BlogPermalinkStructure, BlogUrlPrefix } from './blog-permalink';
import { readSiteSettings, resolvePublicSiteUrl, buildCanonicalPageUrl } from './read-site-settings';
import {
  buildAuthorAbsoluteUrl,
  buildPostJsonLd,
  toAbsoluteUrl,
  toIsoDateTime,
} from './post-json-ld';
import { resolveBemmaeMediaUrl } from './media-url';
import { pickRelatedPosts } from './related-posts';

type Props =
  | { kind: 'post'; post: CollectionEntry<'posts'> }
  | { kind: 'category'; category: CollectionEntry<'categories'> };

export type BlogPageData = {
  useBemmae: boolean;
  layoutType: 'main' | 'local';
  siteName: string;
  beMenu: Record<string, unknown> | null;
  beFootNav: ReturnType<typeof footerNavFromSingleton>;
  beNav: ReturnType<typeof navFromMenu>;
  publicSiteUrl: string;
  post: CollectionEntry<'posts'> | null;
  Content: (() => unknown) | undefined;
  htmlContent: string | null;
  author: Awaited<ReturnType<typeof getEntry<'authors'>>> | null;
  documentTitle: string;
  pageUrl: string;
  ogImageAbs: string | undefined;
  articleIso: string | undefined;
  postJsonLd: ReturnType<typeof buildPostJsonLd> | null;
  category: CollectionEntry<'categories'> | null;
  publishedPosts: CollectionEntry<'posts'>[];
  beBlog: Record<string, unknown>;
  pageDesc: string;
  blogPermalinkStructure: BlogPermalinkStructure;
  blogUrlPrefix: BlogUrlPrefix;
  relatedPosts: CollectionEntry<'posts'>[];
  blogPermalinkStructureResolved: BlogPermalinkStructure;
  blogUrlPrefixResolved: BlogUrlPrefix;
};

export async function loadBlogPageData(
  props: Props,
  pathnameForCanonical: string,
  origin: string,
): Promise<BlogPageData> {
  let useBemmae = false;
  let layoutType: 'main' | 'local' = 'main';
  let siteName = 'Site';
  let beMenu: Record<string, unknown> | null = null;
  let beFootNav: ReturnType<typeof footerNavFromSingleton> = [];
  let beNav: ReturnType<typeof navFromMenu> = [];
  let publicSiteUrl = '';

  let post: CollectionEntry<'posts'> | null = null;
  let Content: (() => unknown) | undefined;
  let htmlContent: string | null = null;
  let author: Awaited<ReturnType<typeof getEntry<'authors'>>> | null = null;
  let documentTitle = '';
  let pageUrl = '';
  let ogImageAbs: string | undefined;
  let articleIso: string | undefined;
  let postJsonLd: ReturnType<typeof buildPostJsonLd> | null = null;

  let category: CollectionEntry<'categories'> | null = null;
  let publishedPosts: CollectionEntry<'posts'>[] = [];
  let beBlog: Record<string, unknown> = {};
  let pageDesc = '';
  let blogPermalinkStructure: BlogPermalinkStructure = 'postname';
  let blogUrlPrefix: BlogUrlPrefix = 'blog';
  let relatedPosts: CollectionEntry<'posts'>[] = [];
  let blogPermalinkStructureResolved: BlogPermalinkStructure = 'postname';
  let blogUrlPrefixResolved: BlogUrlPrefix = 'blog';

  if (props.kind === 'post') {
    post = props.post;
    const slugKey = post.data.slug || post.id;
    const postFile = await readPost(slugKey);
    htmlContent =
      post.data.contentFormat === 'html' && postFile?.content?.trim()
        ? postFile.content.trim()
        : null;

    if (!htmlContent) {
      const r = await render(post);
      Content = r.Content;
    }

    author = post.data.author ? await getEntry('authors', post.data.author) : null;

    const settings = await getEntry('siteSettings', 'settings').catch(() => null);
    const siteMode = (settings?.data?.siteMode || 'blog') as 'blog' | 'local';
    layoutType = siteMode === 'local' ? 'local' : 'main';
    const activeTheme = (settings?.data?.activeTheme || 'classic') as string;
    useBemmae = siteMode !== 'local' && activeTheme === 'bemmae';

    siteName = settings?.data?.siteName || 'Site';
    beMenu = useBemmae ? await readSingleton('menu', 'bemmae') : null;
    const beFoot = useBemmae ? await readSingleton('footer', 'bemmae') : null;
    beNav = beMenu ? navFromMenu(beMenu) : [];
    beFootNav = beFoot ? footerNavFromSingleton(beFoot) : [];
    {
      const metaTitleTrim = post.data.metaTitle?.trim();
      documentTitle = metaTitleTrim ? metaTitleTrim : `${post.data.title} - ${siteName}`;
    }

    const siteCfg = await readSiteSettings();
    publicSiteUrl = resolvePublicSiteUrl(siteCfg.canonicalUrl as string | undefined, origin);
    pageUrl = buildCanonicalPageUrl(publicSiteUrl, pathnameForCanonical);
    {
      const rawImg = post.data.metaImage || post.data.thumbnail;
      ogImageAbs = toAbsoluteUrl(publicSiteUrl, resolveBemmaeMediaUrl(rawImg) || rawImg);
    }
    articleIso = toIsoDateTime(post.data.publishedDate);
    let categoryName: string | undefined;
    let categoryPath: string | undefined;
    if (post.data.category) {
      const cat = await getEntry('categories', post.data.category).catch(() => null);
      if (cat) {
        categoryName = cat.data.name;
        categoryPath = `/${cat.id}`;
      }
    }
    postJsonLd = useBemmae
      ? buildPostJsonLd({
          seoSchema: post.data.seoSchema,
          headline: post.data.title,
          description: post.data.metaDescription || '',
          pageUrl,
          siteUrl: publicSiteUrl,
          siteName: (beMenu as { logoText?: string } | null)?.logoText || siteName,
          publishedDate: post.data.publishedDate,
          imageUrl: ogImageAbs,
          authorName: author?.data?.name,
          authorUrl: author ? buildAuthorAbsoluteUrl(publicSiteUrl, author.id) : undefined,
          htmlContent,
          categoryName,
          categoryPath,
        })
      : null;

    blogPermalinkStructureResolved =
      (settings?.data?.blogPermalinkStructure as BlogPermalinkStructure) || 'postname';
    blogUrlPrefixResolved = (settings?.data?.blogUrlPrefix as BlogUrlPrefix) || 'blog';
    const allPostsForRelated = await getCollection('posts');
    relatedPosts = useBemmae ? pickRelatedPosts(post, allPostsForRelated, 3) : [];
  } else {
    category = props.category;
    const settings = await getEntry('siteSettings', 'settings').catch(() => null);
    const siteMode = (settings?.data?.siteMode || 'blog') as 'blog' | 'local';
    layoutType = siteMode === 'local' ? 'local' : 'main';
    const activeTheme = (settings?.data?.activeTheme || 'classic') as string;
    useBemmae = siteMode !== 'local' && activeTheme === 'bemmae';
    blogPermalinkStructure =
      (settings?.data?.blogPermalinkStructure as BlogPermalinkStructure) || 'postname';
    blogUrlPrefix = (settings?.data?.blogUrlPrefix as BlogUrlPrefix) || 'blog';

    const allPosts = await getCollection('posts');
    publishedPosts = allPosts
      .filter((p) => p.data.publishedDate)
      .sort(
        (a, b) =>
          new Date(b.data.publishedDate!).getTime() - new Date(a.data.publishedDate!).getTime(),
      );
    publishedPosts = publishedPosts.filter((p) => p.data.category === category!.id);

    siteName = settings?.data?.siteName || 'Site';
    beMenu = useBemmae ? await readSingleton('menu', 'bemmae') : null;
    const beFoot = useBemmae ? await readSingleton('footer', 'bemmae') : null;
    beBlog = useBemmae ? (await readSingleton('blog', 'bemmae')) || {} : {};
    beNav = beMenu ? navFromMenu(beMenu) : [];
    beFootNav = beFoot ? footerNavFromSingleton(beFoot) : [];

    const siteCfg = await readSiteSettings();
    publicSiteUrl = resolvePublicSiteUrl(siteCfg.canonicalUrl as string | undefined, origin);
    pageDesc =
      (beBlog as { heroDescription?: string }).heroDescription ||
      `Artigos em ${category!.data.name} no ${siteName}`;
  }

  return {
    useBemmae,
    layoutType,
    siteName,
    beMenu,
    beFootNav,
    beNav,
    publicSiteUrl,
    post,
    Content,
    htmlContent,
    author,
    documentTitle,
    pageUrl,
    ogImageAbs,
    articleIso,
    postJsonLd,
    category,
    publishedPosts,
    beBlog,
    pageDesc,
    blogPermalinkStructure,
    blogUrlPrefix,
    relatedPosts,
    blogPermalinkStructureResolved,
    blogUrlPrefixResolved,
  };
}
