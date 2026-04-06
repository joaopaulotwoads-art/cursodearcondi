/**
 * robots.txt.ts
 *
 * Rota SSR que gera robots.txt dinamicamente.
 * Lê configurações em settings.yaml (generateRobots, canonicalUrl, robotsDisallow).
 * Configurável no Admin → Configurações → SEO Técnico.
 */

import type { APIRoute } from 'astro';
import { readSiteSettings } from '../utils/read-site-settings';

export const GET: APIRoute = async () => {
    const settings = await readSiteSettings();
    const generate = settings.generateRobots !== false;
    const base = (settings.canonicalUrl as string)?.trim() || '';
    const disallow = (settings.robotsDisallow as string[]) || ['/admin', '/api'];

    let body: string;

    if (!generate) {
        body = [
            'User-agent: *',
            'Allow: /',
        ].join('\n');
    } else {
        const lines = [
            'User-agent: *',
            'Allow: /',
            ...disallow.filter(Boolean).map(p => `Disallow: ${p}`),
        ];
        if (base) {
            const sitemapUrl = base.replace(/\/$/, '') + '/sitemap-index.xml';
            lines.push('', `Sitemap: ${sitemapUrl}`);
        }
        body = lines.join('\n');
    }

    return new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
