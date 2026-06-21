/**
 * robots.txt.ts
 *
 * Rota SSR que gera robots.txt dinamicamente.
 * Lê configurações em settings.yaml (generateRobots, canonicalUrl, robotsDisallow).
 * Configurável no Admin → Configurações → SEO Técnico.
 */

import type { APIRoute } from 'astro';
import { readSiteSettings } from '../utils/read-site-settings';

const AI_USER_AGENTS = [
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'anthropic-ai',
    'PerplexityBot',
    'Google-Extended',
    'CCBot',
] as const;

function buildAiBotBlocks(disallow: string[]): string[] {
    const blocks: string[] = ['', '# Crawlers de IA (GEO/AEO) — leitura e citação permitidas'];
    for (const ua of AI_USER_AGENTS) {
        blocks.push('', `User-agent: ${ua}`, 'Allow: /');
        for (const p of disallow.filter(Boolean)) {
            blocks.push(`Disallow: ${p}`);
        }
    }
    return blocks;
}

export const GET: APIRoute = async () => {
    const settings = await readSiteSettings();
    const generate = settings.generateRobots !== false;
    const base = (settings.canonicalUrl as string)?.trim() || '';
    const disallow = (settings.robotsDisallow as string[]) || ['/admin', '/api'];

    let body: string;

    if (!generate) {
        body = [
            ...buildAiBotBlocks(disallow),
            '',
            'User-agent: *',
            'Allow: /',
        ].join('\n');
    } else {
        const lines = [
            ...buildAiBotBlocks(disallow),
            '',
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
