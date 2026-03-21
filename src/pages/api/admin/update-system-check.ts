/**
 * api/admin/update-system-check.ts
 * 
 * Verifica todas as configurações necessárias para o sistema de atualizações
 * funcionar corretamente. Retorna status detalhado de cada componente.
 * 
 * GET /api/admin/update-system-check
 * 
 * Resposta:
 * { 
 *   success: true, 
 *   checks: {
 *     hasGitHubToken: boolean,
 *     hasRepoVars: boolean,
 *     workflowExists: boolean,
 *     permissionsEnabled: boolean,
 *     canCreatePR: boolean,
 *     lastUpdateStatus: object
 *   },
 *   summary: { total: number, passed: number, failed: number }
 * }
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';

type SystemCheck = {
  hasGitHubToken: boolean;
  hasRepoVars: boolean;
  workflowExists: boolean;
  permissionsEnabled: boolean;
  canCreatePR: boolean;
  lastUpdateStatus: {
    success: boolean;
    lastRun?: string;
    error?: string;
  };
};

export const GET: APIRoute = async ({ cookies }) => {
  // ─── Autenticação ──────────────────────────────────────────────────────────
  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session || session.adminRole !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Verificações do sistema ───────────────────────────────────────────────
  const checks: SystemCheck = {
    hasGitHubToken: false,
    hasRepoVars: false,
    workflowExists: false,
    permissionsEnabled: false,
    canCreatePR: false,
    lastUpdateStatus: { success: false }
  };

  const githubToken = process.env.GITHUB_TOKEN?.trim();
  const githubOwner = process.env.GITHUB_OWNER?.trim();
  const githubRepo = process.env.GITHUB_REPO?.trim();

  // 1. Verificar variáveis de ambiente
  checks.hasGitHubToken = !!githubToken && githubToken.startsWith('ghp_');
  checks.hasRepoVars = !!(githubOwner && githubRepo);

  // Se não tiver as variáveis básicas, não adianta testar o resto
  if (!checks.hasGitHubToken || !checks.hasRepoVars) {
    const summary = calculateSummary(checks);
    return new Response(JSON.stringify({ 
      success: true, 
      checks, 
      summary,
      needsBasicConfig: true 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Verificar se workflow existe
  try {
    const workflowRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/.github/workflows/sync-cnx.yml`,
      {
        headers: { 
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      }
    );
    checks.workflowExists = workflowRes.ok;
  } catch (error) {
    console.error('Erro ao verificar workflow:', error);
  }

  // 3. Verificar permissões do repositório
  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}`,
      {
        headers: { 
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      }
    );
    
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      // Se conseguir ler o repo e temos push access, provavelmente as permissões estão OK
      checks.canCreatePR = repoData.permissions?.push === true;
      checks.permissionsEnabled = repoData.permissions?.admin === true || repoData.permissions?.push === true;
    }
  } catch (error) {
    console.error('Erro ao verificar permissões do repositório:', error);
  }

  // 4. Verificar status da última execução do workflow
  if (checks.workflowExists) {
    try {
      const runsRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/sync-cnx.yml/runs?per_page=1`,
        {
          headers: { 
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          }
        }
      );
      
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
          const lastRun = runsData.workflow_runs[0];
          checks.lastUpdateStatus = {
            success: lastRun.conclusion === 'success',
            lastRun: lastRun.created_at,
            error: lastRun.conclusion === 'failure' ? 'Última execução falhou' : undefined
          };
        }
      }
    } catch (error) {
      console.error('Erro ao verificar execuções do workflow:', error);
    }
  }

  // 5. Calcular resumo
  const summary = calculateSummary(checks);

  return new Response(JSON.stringify({ 
    success: true, 
    checks, 
    summary,
    githubOwner,
    githubRepo,
    actionsUrl: `https://github.com/${githubOwner}/${githubRepo}/settings/actions`
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function calculateSummary(checks: SystemCheck) {
  const checkList = [
    checks.hasGitHubToken,
    checks.hasRepoVars, 
    checks.workflowExists,
    checks.permissionsEnabled,
    checks.lastUpdateStatus.success
  ];
  
  const total = checkList.length;
  const passed = checkList.filter(Boolean).length;
  const failed = total - passed;
  
  return { total, passed, failed, percentage: Math.round((passed / total) * 100) };
}