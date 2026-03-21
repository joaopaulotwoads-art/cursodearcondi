/**
 * api/admin/test-github.ts
 *
 * GET — Testa a conexão com a GitHub API e captura o erro exato em caso de falha.
 * Útil para diagnosticar problemas com posts e upload em produção (Vercel).
 *
 * Executa:
 *   1. Verificação das variáveis de ambiente (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)
 *   2. Leitura do repositório (README.md ou primeiro arquivo em src/content/posts)
 *   3. Opcional: simula escrita (só se action=write no query) e captura resposta
 *
 * Retorna: status detalhado, status HTTP da API GitHub, corpo da resposta em erro
 */

import type { APIRoute } from 'astro';
import { isGitHubConfigured } from '../../../utils/github-api';

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function apiUrl(path: string) {
    return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

function headers() {
    return {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export const GET: APIRoute = async ({ url, locals }) => {
    try {
        if (!locals.user) {
            return json({ success: false, error: 'Não autorizado. Faça login no admin.' }, 401);
        }

        const action = url.searchParams.get('action') || 'read';
        const result: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            env: {
                hasToken: !!TOKEN,
                tokenPrefix: TOKEN ? `${TOKEN.slice(0, 8)}...` : null,
                owner: OWNER || null,
                repo: REPO || null,
                branch: BRANCH,
                isConfigured: isGitHubConfigured(),
            },
            vercel: !!process.env.VERCEL,
        };

        if (!isGitHubConfigured()) {
            result.success = false;
            result.error = 'Variáveis não configuradas. Defina GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO na Vercel.';
            return json(result, 200);
        }

        // ── Teste 1: Leitura (README ou diretório de posts) ──
        const readPath = 'README.md';
        result.readTest = { path: readPath };

        const readRes = await fetch(`${apiUrl(readPath)}?ref=${BRANCH}`, { headers: headers() });
        const readBody = await readRes.text();
        let readJson: unknown = null;
        try {
            readJson = JSON.parse(readBody);
        } catch {
            readJson = readBody;
        }

        if (!readRes.ok) {
            result.success = false;
            result.readTest.status = readRes.status;
            result.readTest.statusText = readRes.statusText;
            result.readTest.body = readJson;
            result.error = `GitHub API retornou ${readRes.status}. Verifique owner/repo/branch e permissões do token.`;
            return json(result, 200);
        }

        result.readTest.status = readRes.status;
        result.readTest.ok = true;

        // ── Teste 2 (opcional): Escrita simulada ──
        if (action === 'write') {
            const testPath = 'src/content/posts/_test-github-connection.mdoc';
            const testContent = `---
title: "Teste GitHub"
slug: "_test-github-connection"
---
Conteúdo de teste. Este arquivo pode ser deletado.`;

            const existingRes = await fetch(`${apiUrl(testPath)}?ref=${BRANCH}`, { headers: headers() });
            const existingBody = await existingRes.text();
            let existingSha: string | undefined;
            try {
                const parsed = JSON.parse(existingBody);
                existingSha = parsed.sha;
            } catch {
                /* 404 é ok, arquivo não existe */
            }

            const body: Record<string, unknown> = {
                message: 'test: verificar conexão GitHub (pode deletar)',
                content: Buffer.from(testContent, 'utf-8').toString('base64'),
                branch: BRANCH,
            };
            if (existingSha) body.sha = existingSha;

            const writeRes = await fetch(apiUrl(testPath), {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(body),
            });
            const writeBody = await writeRes.text();
            let writeJson: unknown = null;
            try {
                writeJson = JSON.parse(writeBody);
            } catch {
                writeJson = writeBody;
            }

            result.writeTest = {
                path: testPath,
                status: writeRes.status,
                statusText: writeRes.statusText,
                ok: writeRes.ok,
            };
            if (!writeRes.ok) {
                result.writeTest.body = writeJson;
                result.success = false;
                result.error = `Escrita falhou: HTTP ${writeRes.status}. Resposta do GitHub acima.`;
                return json(result, 200);
            }
        }

        result.success = true;
        result.message = action === 'write'
            ? 'Leitura e escrita OK. GitHub configurado corretamente.'
            : 'Leitura OK. GitHub configurado. Use ?action=write para testar escrita.';

        return json(result, 200);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error('\x1b[31m✗ Erro ao testar GitHub:\x1b[0m', err);
        return json({
            success: false,
            error: msg,
            stack: process.env.NODE_ENV === 'development' ? stack : undefined,
        }, 500);
    }
};
