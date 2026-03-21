/**
 * api/admin/version/update.ts
 *
 * Endpoint que aciona o workflow de atualização do template CNX
 * diretamente pelo painel admin, sem precisar acessar o GitHub.
 *
 * POST /api/admin/version/update
 *
 * Requer: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO nas env vars.
 *
 * Resposta:
 * { success: true, message: "..." }
 * { success: false, error: "..." }
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../../utils/auth-utils';

const WORKFLOW_FILE = 'sync-cnx.yml';

export const POST: APIRoute = async ({ cookies }) => {
    // ─── Autenticação ──────────────────────────────────────────────────────────
    const token = cookies.get(SESSION_COOKIE)?.value;
    const session = token ? verifySession(token) : null;

    if (!session || session.adminRole !== 'admin') {
        return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // ─── Variáveis de ambiente ─────────────────────────────────────────────────
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo  = process.env.GITHUB_REPO;

    if (!githubToken || !githubOwner || !githubRepo) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO nas variáveis de ambiente da Vercel (Settings → Environment Variables).',
            helpUrl: '/admin/ajuda#primeiros-passos',
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // ─── Disparar o workflow via GitHub API ────────────────────────────────────
    try {
        const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: 'main' }),
        });

        // 204 = disparado com sucesso (GitHub não retorna body)
        if (res.status === 204) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Atualização iniciada! O site será reconstruído automaticamente em ~2 minutos.',
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await res.text();
        const actionsSettingsUrl = `https://github.com/${githubOwner}/${githubRepo}/settings/actions`;

        // 422 = workflow não encontrado ou permissões não configuradas
        if (res.status === 422) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Workflow não encontrado ou permissões do GitHub Actions não ativadas. Ative em GitHub → Settings → Actions: "Read and write permissions" e "Allow GitHub Actions to create and approve pull requests".',
                helpUrl: actionsSettingsUrl,
            }), {
                status: 422,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 403 = permissões insuficientes (workflow permissions)
        if (res.status === 403) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Acesso negado pelo GitHub. Ative as permissões do workflow em GitHub → Settings → Actions (Passo 3 em Ajuda → Primeiros passos).',
                helpUrl: actionsSettingsUrl,
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.error('\x1b[31m✗ [X] GitHub API respondeu ' + res.status + ':\x1b[0m', body);

        return new Response(JSON.stringify({
            success: false,
            error: `Erro ao acionar o workflow (status ${res.status}). Verifique se o GITHUB_TOKEN tem permissão "repo" e se as permissões do workflow estão ativadas (Ajuda → Primeiros passos).`,
            helpUrl: actionsSettingsUrl,
        }), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('❌ Erro ao acionar workflow de atualização:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro de rede ao contatar o GitHub. Tente novamente.',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
