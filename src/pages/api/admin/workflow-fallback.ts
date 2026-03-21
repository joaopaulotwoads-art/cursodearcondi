/**
 * api/admin/workflow-fallback.ts
 *
 * GET — Retorna URL e conteúdo para criar manualmente o workflow no GitHub.
 * Usado quando a API falha (bug do GitHub: 404 em paths .github).
 *
 * Retorna: { createUrl, content, owner, repo, branch }
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';

const TEMPLATE_RAW =
  'https://raw.githubusercontent.com/8linksapp-maker/cnx/main/.github/workflows/sync-cnx.yml';

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session || session.adminRole !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Não autorizado.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = (process.env.GITHUB_BRANCH?.trim() || 'main');

  if (!owner || !repo) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'GITHUB_OWNER e GITHUB_REPO não configurados.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(TEMPLATE_RAW);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível obter o template.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const content = await res.text();
    const createUrl = `https://github.com/${owner}/${repo}/new/${branch}?filename=.github%2Fworkflows%2Fsync-cnx.yml`;

    return new Response(
      JSON.stringify({
        success: true,
        createUrl,
        content,
        owner,
        repo,
        branch,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao buscar template.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
