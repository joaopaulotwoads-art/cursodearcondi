/**
 * api/admin/site-settings.ts
 *
 * Endpoint para leitura e atualização das configurações globais do site
 * armazenadas em src/content/singletons/settings.yaml.
 *
 * GET  /api/admin/site-settings → retorna configurações atuais
 * PUT  /api/admin/site-settings → atualiza configurações (colorScheme, siteName, etc.)
 */

import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { isGitHubConfigured, githubWriteFile, githubReadFile } from '../../../utils/github-api';
import { SITE_MODE_COOKIE, SITE_MODE_COOKIE_MAX_AGE, SITE_MODE_COOKIE_PATH } from '../../../utils/admin-site-mode';
import { normalizeCanonicalUrl } from '../../../utils/read-site-settings';

const SETTINGS_PATH     = path.resolve('./src/content/singletons/settings.yaml');
const SETTINGS_GH_PATH  = 'src/content/singletons/settings.yaml';

/** GitHub bloqueia commits com estes campos (secret scanning). Não enviar ao repositório. */
const SETTINGS_REPO_SECRET_KEYS = ['aiApiKey', 'pexelsApiKey'] as const;

function removeSettingsRepoSecrets(data: Record<string, unknown>): Record<string, unknown> {
    const o = { ...data };
    for (const k of SETTINGS_REPO_SECRET_KEYS) {
        delete o[k];
    }
    return o;
}

async function readSettings(): Promise<Record<string, unknown>> {
    const defaults = { siteName: 'CNX Agency', colorScheme: 'dark', siteMode: 'blog' };
    try {
        // Priorizar sempre o arquivo local — assim API e getEntry (content layer) leem a mesma fonte.
        // Só usar GitHub quando o disco não está disponível (ex.: Vercel serverless).
        const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
        return (yaml.load(content) as Record<string, unknown>) || defaults;
    } catch {
        if (isGitHubConfigured()) {
            try {
                const file = await githubReadFile(SETTINGS_GH_PATH);
                if (file) return (yaml.load(file.content) as Record<string, unknown>) || defaults;
            } catch (e) {
                console.error('❌ Erro ao ler site-settings do GitHub:', e);
            }
        }
        return defaults;
    }
}

async function writeSettings(data: Record<string, unknown>): Promise<{
    success: boolean;
    error?: string;
    /** true quando chaves foram omitidas do YAML por causa do GitHub / secret scanning */
    secretsSkippedForRepo?: boolean;
}> {
    const persist =
        isGitHubConfigured() ? removeSettingsRepoSecrets(data) : data;
    const hadSecretInPayload =
        SETTINGS_REPO_SECRET_KEYS.some((k) => String((data as Record<string, string>)[k] || '').trim() !== '');
    const content = yaml.dump(persist, { lineWidth: -1, noRefs: true, quotingType: '"' });

    // Sempre tentar escrever localmente primeiro — assim o Astro content layer (getEntry)
    // vê a mudança ao recarregar a página. Sem isso, com GitHub configurado, só íamos
    // para o GitHub e o arquivo local ficava desatualizado.
    try {
        await fs.writeFile(SETTINGS_PATH, content, 'utf-8');
    } catch (err) {
        // Em produção (Vercel) o filesystem é read-only — ignorar; o GitHub persiste
        if (!isGitHubConfigured()) throw err;
    }

    if (isGitHubConfigured()) {
        const gh = await githubWriteFile(SETTINGS_GH_PATH, content, 'content: update site settings');
        if (!gh.ok) {
            return {
                success: false,
                error: gh.error || 'Não foi possível gravar settings.yaml no GitHub (verifique token e variáveis na Vercel).',
            };
        }
    }
    return {
        success: true,
        secretsSkippedForRepo: isGitHubConfigured() && hadSecretInPayload,
    };
}

export const GET: APIRoute = async () => {
    try {
        const data = await readSettings();
        // Migração suave: se settings não tem phone/whatsapp, sugerir valores de local/home
        const phone = (data.companyPhone as string)?.trim();
        const whatsapp = (data.companyWhatsapp as string)?.trim();
        if (!phone && !whatsapp) {
            try {
                const { readSingleton } = await import('../../../utils/singleton-utils');
                const localHome = await readSingleton('home', 'local');
                const p = (localHome?.companyPhone as string)?.trim().replace(/\D/g, '') || '';
                const w = (localHome?.companyWhatsapp as string)?.trim().replace(/\D/g, '') || '';
                if (p || w) {
                    (data as any).suggestedCompanyPhone = p;
                    (data as any).suggestedCompanyWhatsapp = w || p;
                }
            } catch {}
        }

        const provider = ((data.aiProvider as string) || 'gemini').toLowerCase();
        const aiKeyInFile = !!(data.aiApiKey as string)?.trim();
        const aiInEnv =
            provider === 'openai'
                ? !!(process.env.OPENAI_API_KEY || '').trim()
                : !!(process.env.GEMINI_API_KEY || '').trim();
        const pexelsInFile = !!(data.pexelsApiKey as string)?.trim();
        const pexelsInEnv = !!(process.env.PEXELS_API_KEY || '').trim();
        (data as Record<string, unknown>).aiApiKeyConfiguredInEnvironment = !aiKeyInFile && aiInEnv;
        (data as Record<string, unknown>).pexelsApiKeyConfiguredInEnvironment = !pexelsInFile && pexelsInEnv;

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao ler site-settings:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const current = await readSettings();
        const updated = { ...current, ...body };
        if (typeof body.canonicalUrl === 'string' && body.canonicalUrl.trim()) {
            const norm = normalizeCanonicalUrl(body.canonicalUrl);
            if (norm) (updated as Record<string, unknown>).canonicalUrl = norm;
        }

        const wrote = await writeSettings(updated);
        if (!wrote.success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: wrote.error || 'Erro ao salvar configurações',
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (typeof body.siteMode === 'string' && (body.siteMode === 'blog' || body.siteMode === 'local')) {
            const secure = import.meta.env.PROD ? '; Secure' : '';
            headers['Set-Cookie'] = `${SITE_MODE_COOKIE}=${body.siteMode}; Path=${SITE_MODE_COOKIE_PATH}; Max-Age=${SITE_MODE_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: updated,
                secretsSkippedForRepo: wrote.secretsSkippedForRepo === true,
            }),
            {
                status: 200,
                headers,
            },
        );
    } catch (error: any) {
        console.error('❌ Erro ao atualizar site-settings:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
