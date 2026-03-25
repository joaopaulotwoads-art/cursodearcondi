/**
 * sitemap.xml.ts
 *
 * Alias convencional: mesmo conteúdo que /sitemap-index.xml
 * (muitas ferramentas e utilizadores esperam /sitemap.xml).
 */

import type { APIRoute } from 'astro';
import { getSitemapXmlResponse } from '../utils/sitemap-xml';

export const GET: APIRoute = getSitemapXmlResponse;
