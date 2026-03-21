/**
 * api/admin/version.ts
 *
 * Endpoint que retorna a versão atual do template instalado no site do aluno
 * e compara com a versão mais recente disponível no repositório oficial do CNX.
 *
 * GET /api/admin/version
 *
 * Resposta:
 * {
 *   installed: "1.0.0",          — versão que o aluno tem instalada
 *   latest: "1.1.0",             — versão mais recente no template oficial
 *   upToDate: false,             — true se já está na última versão
 *   changelog: "https://..."     — link para ver o que mudou
 * }
 */

import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

const TEMPLATE_OWNER = '8linksapp-maker';
const TEMPLATE_REPO  = 'cnx';
const CHANGELOG_URL  = `https://github.com/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/blob/main/CHANGELOG.md`;
const VERSION_URL    = `https://raw.githubusercontent.com/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/main/VERSION`;

async function getInstalledVersion(): Promise<string> {
    try {
        const versionPath = path.resolve('./VERSION');
        const content = await fs.readFile(versionPath, 'utf-8');
        return content.trim();
    } catch {
        return '0.0.0';
    }
}

async function getLatestVersion(): Promise<string | null> {
    try {
        const res = await fetch(VERSION_URL, {
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const text = await res.text();
        return text.trim();
    } catch {
        return null;
    }
}

function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

export const GET: APIRoute = async () => {
    try {
        const [installed, latest] = await Promise.all([
            getInstalledVersion(),
            getLatestVersion(),
        ]);

        const upToDate = latest ? compareVersions(installed, latest) >= 0 : true;

        return new Response(JSON.stringify({
            installed,
            latest:     latest ?? installed,
            upToDate,
            changelog:  CHANGELOG_URL,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('❌ Erro ao verificar versão do template:', error);
        return new Response(JSON.stringify({
            installed: '0.0.0',
            latest:    '0.0.0',
            upToDate:  true,
            changelog: CHANGELOG_URL,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
