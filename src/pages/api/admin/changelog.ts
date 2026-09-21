/**
 * api/admin/changelog.ts
 *
 * Endpoint que busca o CHANGELOG.md do template oficial no GitHub
 * e retorna em formato HTML para exibição na página de Configurações.
 *
 * GET /api/admin/changelog
 *
 * Resposta: { html: string, installedVersion?: string }
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const TEMPLATE_OWNER = '8linksapp-maker';
const TEMPLATE_REPO = 'cnx';
const CHANGELOG_RAW_URL = `https://raw.githubusercontent.com/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/main/CHANGELOG.md`;

marked.setOptions({ gfm: true, breaks: true });

async function getInstalledVersion(): Promise<string> {
    try {
        const versionPath = path.resolve('./VERSION');
        const content = await fs.readFile(versionPath, 'utf-8');
        return content.trim();
    } catch {
        return '0.0.0';
    }
}

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE)?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
        return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const res = await fetch(CHANGELOG_RAW_URL, {
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            return new Response(
                JSON.stringify({
                    html: '<p class="text-[#a3a3a3] text-sm">Não foi possível carregar o changelog. Tente novamente mais tarde.</p>',
                    installedVersion: await getInstalledVersion(),
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const markdown = await res.text();
        const html = marked.parse(markdown) as string;
        const installedVersion = await getInstalledVersion();

        return new Response(
            JSON.stringify({ html, installedVersion }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        console.error('\x1b[31m✗ [X] Erro ao buscar changelog:\x1b[0m', err);
        return new Response(
            JSON.stringify({
                html: '<p class="text-[#a3a3a3] text-sm">Erro ao carregar o changelog. Verifique sua conexão.</p>',
                installedVersion: await getInstalledVersion(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
