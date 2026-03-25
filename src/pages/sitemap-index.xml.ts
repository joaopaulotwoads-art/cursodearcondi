/**
 * sitemap-index.xml.ts
 *
 * Rota SSR que gera o sitemap XML dinamicamente.
 * Inclui: páginas estáticas, posts, autores e páginas locais (location × service).
 * Lê configurações em settings.yaml (generateSitemap, canonicalUrl).
 * Configurável no Admin → Configurações → SEO Técnico.
 *
 * O mesmo XML está disponível em /sitemap.xml (ver sitemap.xml.ts).
 */

import type { APIRoute } from 'astro';
import { getSitemapXmlResponse } from '../utils/sitemap-xml';

export const GET: APIRoute = getSitemapXmlResponse;
