/**
 * api/admin/ensure-workflow.ts
 *
 * POST — Garante que .github/workflows/sync-cnx.yml existe no repositório do usuário.
 * Chamado pelo painel em Configurações → Atualizações quando o usuário ativa
 * "Atualizações automáticas".
 *
 * Requer: admin logado, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';
import { ensureWorkflow } from '../../../utils/ensure-workflow-core';

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session || session.adminRole !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Não autorizado.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = await ensureWorkflow();

  if (result.ok) {
    const message =
      result.status === 'created'
        ? 'Workflow de atualização criado com sucesso. O botão "Aplicar agora" deve funcionar agora.'
        : 'Atualizações automáticas já estão configuradas.';
    return new Response(
      JSON.stringify({ success: true, message, status: result.status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: result.error,
      manualFallback: 'manualFallback' in result && result.manualFallback,
      helpUrl: 'https://github.com/8linksapp-maker/cnx#-variáveis-de-ambiente-referência',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
};
