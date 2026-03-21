/**
 * api/admin/github-actions-url.ts
 *
 * GET — Retorna o link direto para Settings → Actions → General do repositório.
 * Usado em Configurações → Atualizações para facilitar o acesso às permissões.
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session || session.adminRole !== 'admin') {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();

  if (!owner || !repo) {
    return new Response(
      JSON.stringify({ success: false, actionsSettingsUrl: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const actionsSettingsUrl = `https://github.com/${owner}/${repo}/settings/actions`;

  return new Response(
    JSON.stringify({ success: true, actionsSettingsUrl }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
