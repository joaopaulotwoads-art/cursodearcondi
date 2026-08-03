/**
 * read-site-settings.ts
 *
 * Utilitário para leitura das configurações globais do site (settings.yaml).
 * Usado pelas rotas sitemap, robots.txt e pela API site-settings.
 * Suporta filesystem local e GitHub API quando em produção (Vercel).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { isGitHubConfigured, githubReadFile } from './github-api';

const SETTINGS_PATH    = path.resolve('./src/content/singletons/settings.yaml');
const SETTINGS_GH_PATH = 'src/content/singletons/settings.yaml';

const DEFAULTS: Record<string, unknown> = {
    activeTheme: 'classic',
    siteName: 'CNX Agency',
    colorScheme: 'dark',
    siteMode: 'blog',
    generateSitemap: true,
    generateRobots: true,
    robotsDisallow: ['/admin', '/api'],
    blogPermalinkStructure: 'postname',
    blogUrlPrefix: 'blog',
};

/** Normaliza canonicalUrl: se não tiver protocolo, adiciona https:// */
export function normalizeCanonicalUrl(url: string | undefined): string {
    const t = (url || '').trim();
    if (!t) return '';
    if (t.startsWith('http://') || t.startsWith('https://')) return t.replace(/\/+$/, '');
    const domain = t.split('/')[0];
    return domain ? `https://${domain}` : '';
}

export async function readSiteSettings(): Promise<Record<string, unknown>> {
    try {
        const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
        const loaded = yaml.load(content) as Record<string, unknown>;
        const merged = { ...DEFAULTS, ...loaded };
        if (merged.canonicalUrl) {
            merged.canonicalUrl = normalizeCanonicalUrl(merged.canonicalUrl as string);
        }
        return merged;
    } catch {
        if (isGitHubConfigured()) {
            try {
                const file = await githubReadFile(SETTINGS_GH_PATH);
                if (file) {
                    const loaded = yaml.load(file.content) as Record<string, unknown>;
                    const merged = { ...DEFAULTS, ...loaded };
                    if (merged.canonicalUrl) {
                        merged.canonicalUrl = normalizeCanonicalUrl(merged.canonicalUrl as string);
                    }
                    return merged;
                }
            } catch (e) {
                console.error('\x1b[31m✗ Erro ao ler site-settings do GitHub:\x1b[0m', e);
            }
        }
        return { ...DEFAULTS };
    }
}
