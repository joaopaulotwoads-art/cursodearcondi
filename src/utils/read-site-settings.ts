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
    activeTheme: 'bemmae',
    siteName: 'Bem Mãe',
    colorScheme: 'light',
    siteMode: 'blog',
    generateSitemap: true,
    generateRobots: true,
    robotsDisallow: ['/admin', '/api'],
    blogPermalinkStructure: 'postname',
    blogUrlPrefix: 'blog',
};

/**
 * Normaliza URL canônica do site: https, só origem (sem path), sem prefixo www.
 * Alinha com domínio principal apex na Vercel.
 */
export function normalizeCanonicalUrl(url: string | undefined): string {
    const t = (url || '').trim();
    if (!t) return '';
    let href = t;
    if (!/^https?:\/\//i.test(href)) {
        const domain = href.split('/')[0]?.trim() || '';
        if (!domain) return '';
        href = `https://${domain}`;
    } else {
        href = href.replace(/\/+$/, '');
    }
    try {
        const u = new URL(href);
        if (u.hostname.startsWith('www.')) {
            u.hostname = u.hostname.slice(4);
        }
        return u.origin;
    } catch {
        return '';
    }
}

/** Remove www do host da requisição (fallback quando canonicalUrl não está definido). */
export function stripWwwFromOrigin(origin: string): string {
    try {
        const u = new URL(origin);
        if (u.hostname.startsWith('www.')) {
            u.hostname = u.hostname.slice(4);
        }
        return u.origin;
    } catch {
        return origin;
    }
}

/** Base pública do site: settings primeiro, senão origem da requisição sem www. */
export function resolvePublicSiteUrl(canonicalFromSettings: string | undefined, requestOrigin: string): string {
    const fromSettings = normalizeCanonicalUrl(canonicalFromSettings);
    if (fromSettings) return fromSettings;
    return stripWwwFromOrigin(requestOrigin);
}

/**
 * Força origem pública apex (https, sem www) a partir de qualquer string de base que as páginas recebam.
 */
export function ensureApexSiteOrigin(url: string): string {
    const t = (url || '').trim();
    if (!t) return '';
    const n = normalizeCanonicalUrl(t);
    if (n) return n;
    return stripWwwFromOrigin(t);
}

/** Path para &lt;link rel="canonical"&gt;: "/" na raiz; demais URLs sem barra final. */
export function canonicalPathname(pathname: string): string {
    const p = pathname || '/';
    if (p === '/' || p === '') return '/';
    return p.replace(/\/+$/, '') || '/';
}

/** URL canônica da página atual (apex + path normalizado, sem barra final exceto na raiz). */
export function buildCanonicalPageUrl(siteBaseOrigin: string, pathname: string): string {
    const origin = ensureApexSiteOrigin(siteBaseOrigin);
    const path = canonicalPathname(pathname);
    const base = origin.replace(/\/+$/, '');
    if (path === '/') return `${base}/`;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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
