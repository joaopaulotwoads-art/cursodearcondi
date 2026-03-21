/**
 * api/admin/diagnostics.ts
 * 
 * Sistema de diagnóstico completo que testa todos os aspectos do sistema
 * de atualizações e fornece soluções específicas para cada problema.
 * 
 * GET /api/admin/diagnostics
 * 
 * Executa testes abrangentes e retorna:
 * - Status de cada componente
 * - Detalhes técnicos dos erros
 * - Sugestões automáticas de solução
 * - Links diretos para correção
 */

import type { APIRoute } from 'astro';
import { verifySession, SESSION_COOKIE } from '../../../utils/auth-utils';

type DiagnosticTest = {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  solution?: {
    title: string;
    description: string;
    action: string;
    link?: string;
  };
  technical?: string;
};

type DiagnosticReport = {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    overall: 'healthy' | 'issues' | 'critical';
  };
  tests: DiagnosticTest[];
  quickFixes: string[];
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

  // ─── Executar diagnósticos ─────────────────────────────────────────────────
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    summary: { total: 0, passed: 0, failed: 0, warnings: 0, overall: 'healthy' },
    tests: [],
    quickFixes: []
  };

  const githubToken = process.env.GITHUB_TOKEN?.trim();
  const githubOwner = process.env.GITHUB_OWNER?.trim();
  const githubRepo = process.env.GITHUB_REPO?.trim();

  // Teste 1: Variáveis de ambiente
  report.tests.push(await testEnvironmentVariables(githubToken, githubOwner, githubRepo));

  // Se não tiver variáveis básicas, parar aqui
  if (!githubToken || !githubOwner || !githubRepo) {
    report.summary = calculateSummary(report.tests);
    return new Response(JSON.stringify({ success: true, report }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Teste 2: Conectividade GitHub API
  report.tests.push(await testGitHubConnection(githubToken, githubOwner, githubRepo));

  // Teste 3: Workflow existente
  report.tests.push(await testWorkflowExists(githubToken, githubOwner, githubRepo));

  // Teste 4: Permissões do repositório
  report.tests.push(await testRepositoryPermissions(githubToken, githubOwner, githubRepo));

  // Teste 5: Histórico de execuções
  report.tests.push(await testWorkflowHistory(githubToken, githubOwner, githubRepo));

  // Teste 6: Verificação de versões
  report.tests.push(await testVersionCheck(githubToken, githubOwner, githubRepo));

  // Calcular resumo final
  report.summary = calculateSummary(report.tests);
  
  // Gerar quick fixes
  report.quickFixes = generateQuickFixes(report.tests, githubOwner, githubRepo);

  return new Response(JSON.stringify({ success: true, report }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// ─── Testes individuais ────────────────────────────────────────────────────────

async function testEnvironmentVariables(
  token: string | undefined,
  owner: string | undefined,
  repo: string | undefined
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'env_vars',
    name: 'Variáveis de Ambiente',
    description: 'Verificar se todas as variáveis necessárias estão configuradas',
    status: 'pass',
    details: 'Todas as variáveis estão configuradas corretamente'
  };

  const issues: string[] = [];
  
  if (!token) issues.push('GITHUB_TOKEN ausente');
  else if (!token.startsWith('ghp_')) issues.push('GITHUB_TOKEN formato inválido');
  
  if (!owner) issues.push('GITHUB_OWNER ausente');
  if (!repo) issues.push('GITHUB_REPO ausente');

  if (issues.length > 0) {
    test.status = 'fail';
    test.details = getEnvironmentErrorMessage(issues);
    test.solution = {
      title: 'Como resolver: Configurar conexão com o GitHub',
      description: getEnvironmentSolutionMessage(issues),
      action: 'Abrir configurações da Vercel',
      link: 'https://vercel.com/dashboard'
    };
    test.technical = 'Configure em Vercel → Projeto → Settings → Environment Variables';
  }

  return test;
}

async function testGitHubConnection(
  token: string,
  owner: string,
  repo: string
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'github_connection',
    name: 'Conexão com GitHub',
    description: 'Testar se o token tem acesso ao repositório',
    status: 'pass',
    details: 'Conexão estabelecida com sucesso'
  };

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    if (!response.ok) {
      test.status = 'fail';
      const errorInfo = await response.text();
      
      if (response.status === 401) {
        test.details = '🔑 Token expirado ou inválido: O GitHub não reconhece o token de acesso atual. Isso acontece quando o token expira ou foi deletado.';
        test.solution = {
          title: 'Como resolver: Renovar token do GitHub',
          description: 'O token de acesso precisa ser renovado. É um processo simples: crie um novo token no GitHub e atualize na Vercel.',
          action: 'Criar novo token agora',
          link: 'https://github.com/settings/tokens/new?description=CNX+CMS&scopes=repo'
        };
        test.technical = `GitHub API retornou 401: ${errorInfo}`;
      } else if (response.status === 403) {
        test.details = '⛔ Permissão negada: O token existe, mas não tem permissão para acessar este repositório. Verifique se o token foi criado com as permissões corretas.';
        test.solution = {
          title: 'Como resolver: Verificar permissões do token',
          description: 'O token precisa ter permissão total no repositório (escopo "repo"). Crie um novo token com as permissões corretas.',
          action: 'Criar token com permissões',
          link: 'https://github.com/settings/tokens/new?description=CNX+CMS&scopes=repo'
        };
        test.technical = `GitHub API retornou 403: ${errorInfo}`;
      } else if (response.status === 404) {
        test.details = '📂 Repositório não encontrado: O GitHub não encontra o repositório ou o token não tem acesso a ele. Verifique se as informações GITHUB_OWNER e GITHUB_REPO estão corretas.';
        test.solution = {
          title: 'Como resolver: Verificar informações do repositório',
          description: 'Confirme se GITHUB_OWNER (seu usuário) e GITHUB_REPO (nome do repositório) estão corretos na Vercel.',
          action: 'Verificar configurações',
          link: 'https://vercel.com/dashboard'
        };
        test.technical = `GitHub API retornou 404: ${errorInfo}`;
      } else {
        test.details = `🌐 Erro de comunicação: O GitHub retornou um erro inesperado (código ${response.status}). Isso pode ser um problema temporário.`;
        test.solution = {
          title: 'Como resolver: Tentar novamente',
          description: 'Aguarde alguns minutos e tente novamente. Se persistir, pode ser um problema temporário do GitHub.',
          action: 'Tentar diagnóstico novamente',
          link: '/admin/configuracoes/atualizacoes'
        };
        test.technical = `GitHub API retornou ${response.status}: ${errorInfo}`;
      }
    }
  } catch (error) {
    test.status = 'fail';
    test.details = '🌐 Problema de conexão: Não foi possível conectar com o GitHub. Verifique sua conexão com a internet ou tente novamente em alguns minutos.';
    test.solution = {
      title: 'Como resolver: Verificar conexão',
      description: 'Problemas de rede são temporários. Verifique se sua internet está funcionando e tente novamente.',
      action: 'Tentar novamente',
      link: '/admin/configuracoes/atualizacoes'
    };
    test.technical = error instanceof Error ? error.message : String(error);
  }

  return test;
}

async function testWorkflowExists(
  token: string,
  owner: string,
  repo: string
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'workflow_exists',
    name: 'Arquivo de Workflow',
    description: 'Verificar se .github/workflows/sync-cnx.yml existe',
    status: 'pass',
    details: 'Workflow encontrado e configurado'
  };

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/sync-cnx.yml`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      }
    );

    if (!response.ok) {
      test.status = 'fail';
      test.details = '📄 Arquivo de atualização não encontrado: O sistema precisa de um arquivo especial no seu repositório para fazer atualizações automáticas, mas ele não existe ainda.';
      test.solution = {
        title: 'Como resolver: Criar arquivo de atualizações',
        description: 'Este arquivo será criado automaticamente quando você ativar as atualizações. É um processo seguro e necessário.',
        action: 'Ativar atualizações automáticas',
        link: `/admin/configuracoes/atualizacoes`
      };
      test.technical = `GitHub API retornou ${response.status}`;
    }
  } catch (error) {
    test.status = 'fail';
    test.details = '🔍 Problema ao verificar configuração: Não foi possível verificar se os arquivos de atualização existem. Isso pode ser temporário.';
    test.solution = {
      title: 'Como resolver: Tentar novamente',
      description: 'Aguarde alguns minutos e execute o diagnóstico novamente.',
      action: 'Executar diagnóstico',
      link: '/admin/configuracoes/atualizacoes'
    };
    test.technical = error instanceof Error ? error.message : String(error);
  }

  return test;
}

async function testRepositoryPermissions(
  token: string,
  owner: string,
  repo: string
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'repo_permissions',
    name: 'Permissões do Repositório',
    description: 'Verificar permissões necessárias para atualizações',
    status: 'pass',
    details: 'Permissões adequadas configuradas'
  };

  try {
    // Testar permissões tentando acessar configurações do Actions
    const actionsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/permissions`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      }
    );

    if (!actionsRes.ok) {
      test.status = 'warning';
      test.details = '⚙️ Permissões não verificadas: Não foi possível confirmar se as permissões do GitHub Actions estão configuradas. Isso é importante para as atualizações funcionarem.';
      test.solution = {
        title: 'Como resolver: Verificar permissões do GitHub Actions',
        description: 'Acesse as configurações do seu repositório e ative "Read and write permissions" para permitir atualizações automáticas.',
        action: 'Abrir configurações do repositório',
        link: `https://github.com/${owner}/${repo}/settings/actions`
      };
    }

    // Testar se consegue criar uma branch (simulação)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    if (repoRes.ok) {
      const repoData = await repoRes.json();
      if (!repoData.permissions?.push) {
        test.status = 'fail';
        test.details = '🔒 Token sem permissão de escrita: O token pode acessar o repositório, mas não tem permissão para fazer alterações (escrever). Atualizações automáticas precisam dessa permissão.';
        test.solution = {
          title: 'Como resolver: Criar token com permissões completas',
          description: 'Crie um novo token no GitHub selecionando o escopo "repo" (que inclui permissões de leitura e escrita).',
          action: 'Criar novo token com permissões',
          link: 'https://github.com/settings/tokens/new?description=CNX+CMS&scopes=repo'
        };
      }
    }
  } catch (error) {
    test.status = 'warning';
    test.details = '🔍 Não foi possível verificar permissões: Houve um problema temporário ao verificar as permissões do repositório.';
    test.solution = {
      title: 'Como resolver: Tentar novamente',
      description: 'Execute o diagnóstico novamente em alguns minutos.',
      action: 'Executar diagnóstico',
      link: '/admin/configuracoes/atualizacoes'
    };
    test.technical = error instanceof Error ? error.message : String(error);
  }

  return test;
}

async function testWorkflowHistory(
  token: string,
  owner: string,
  repo: string
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'workflow_history',
    name: 'Histórico de Execuções',
    description: 'Verificar se o workflow está executando corretamente',
    status: 'pass',
    details: 'Workflow funcionando normalmente'
  };

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/sync-cnx.yml/runs?per_page=3`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const runs = data.workflow_runs || [];
      
      if (runs.length === 0) {
        test.status = 'warning';
        test.details = '🚀 Sistema nunca foi testado: As atualizações automáticas ainda não foram executadas. É recomendado fazer um teste para garantir que tudo funciona.';
        test.solution = {
          title: 'Como resolver: Fazer um teste',
          description: 'Execute uma atualização manual para verificar se o sistema está funcionando corretamente.',
          action: 'Fazer teste agora',
          link: `https://github.com/${owner}/${repo}/actions/workflows/sync-cnx.yml`
        };
      } else {
        const lastRun = runs[0];
        const runDate = new Date(lastRun.created_at).toLocaleDateString('pt-BR');
        
        if (lastRun.conclusion === 'failure') {
          test.status = 'fail';
          test.details = `❌ Última atualização falhou: A execução do dia ${runDate} não funcionou. Isso impede que novas atualizações sejam aplicadas.`;
          test.solution = {
            title: 'Como resolver: Verificar o que deu errado',
            description: 'Veja os detalhes do erro para entender o que precisa ser corrigido.',
            action: 'Ver detalhes do erro',
            link: lastRun.html_url
          };
        } else if (lastRun.conclusion === 'success') {
          test.details = `✅ Sistema funcionando: Última execução bem-sucedida em ${runDate}`;
        }
      }
    } else {
      test.status = 'warning';
      test.details = '📊 Histórico não disponível: Não foi possível verificar se as atualizações automáticas já foram executadas.';
      test.solution = {
        title: 'Como resolver: Tentar novamente',
        description: 'Execute o diagnóstico novamente em alguns minutos.',
        action: 'Executar diagnóstico',
        link: '/admin/configuracoes/atualizacoes'
      };
    }
  } catch (error) {
    test.status = 'warning';
    test.details = '🔍 Problema temporário: Não foi possível verificar o histórico de atualizações devido a um problema de conexão.';
    test.solution = {
      title: 'Como resolver: Tentar novamente',
      description: 'Execute o diagnóstico novamente em alguns minutos.',
      action: 'Executar diagnóstico',
      link: '/admin/configuracoes/atualizacoes'
    };
    test.technical = error instanceof Error ? error.message : String(error);
  }

  return test;
}

async function testVersionCheck(
  token: string,
  owner: string,
  repo: string
): Promise<DiagnosticTest> {
  const test: DiagnosticTest = {
    id: 'version_check',
    name: 'Verificação de Versões',
    description: 'Comparar versão atual com template original',
    status: 'pass',
    details: 'Site está na versão mais recente'
  };

  try {
    // Buscar versão do template original
    const templateVersionRes = await fetch('https://raw.githubusercontent.com/8linksapp-maker/cnx/main/VERSION');
    const templateVersion = templateVersionRes.ok ? (await templateVersionRes.text()).trim() : null;

    // Buscar versão do repositório atual
    const currentVersionRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/VERSION`);
    const currentVersion = currentVersionRes.ok ? (await currentVersionRes.text()).trim() : null;

    if (!templateVersion || !currentVersion) {
      test.status = 'warning';
      test.details = '📦 Não foi possível verificar versões: Não conseguimos comparar a versão do seu site com a mais recente disponível.';
      test.solution = {
        title: 'Como resolver: Tentar novamente',
        description: 'Execute o diagnóstico novamente em alguns minutos.',
        action: 'Executar diagnóstico',
        link: '/admin/configuracoes/atualizacoes'
      };
      test.technical = `Template: ${templateVersion || 'não encontrado'}, Atual: ${currentVersion || 'não encontrado'}`;
    } else if (templateVersion !== currentVersion) {
      test.status = 'warning';
      test.details = `🆕 Nova versão disponível: Seu site está na versão ${currentVersion}, mas já existe a versão ${templateVersion} com melhorias e correções.`;
      test.solution = {
        title: 'Como resolver: Atualizar para a versão mais recente',
        description: 'As atualizações trazem melhorias, correções de bugs e novos recursos. Seu conteúdo não será alterado.',
        action: 'Atualizar agora',
        link: '/admin/configuracoes/atualizacoes'
      };
    } else {
      test.details = `✅ Versão atualizada: Seu site está na versão mais recente (v${currentVersion})`;
    }
  } catch (error) {
    test.status = 'warning';
    test.details = '🔍 Problema ao verificar versões: Não foi possível comparar as versões devido a um problema de conexão.';
    test.solution = {
      title: 'Como resolver: Tentar novamente',
      description: 'Execute o diagnóstico novamente em alguns minutos.',
      action: 'Executar diagnóstico',
      link: '/admin/configuracoes/atualizacoes'
    };
    test.technical = error instanceof Error ? error.message : String(error);
  }

  return test;
}

function calculateSummary(tests: DiagnosticTest[]) {
  const total = tests.length;
  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = tests.filter(t => t.status === 'fail').length;
  const warnings = tests.filter(t => t.status === 'warning').length;
  
  let overall: 'healthy' | 'issues' | 'critical';
  if (failed > 0) overall = 'critical';
  else if (warnings > 0) overall = 'issues';
  else overall = 'healthy';
  
  return { total, passed, failed, warnings, overall };
}

function generateQuickFixes(tests: DiagnosticTest[], owner: string, repo: string): string[] {
  const fixes: string[] = [];
  
  const failedTests = tests.filter(t => t.status === 'fail');
  
  if (failedTests.some(t => t.id === 'env_vars')) {
    fixes.push('🔧 Configurar as informações de conexão com o GitHub na Vercel (token, usuário e repositório)');
  }
  
  if (failedTests.some(t => t.id === 'github_connection')) {
    fixes.push('🔑 Criar um novo token do GitHub com permissões adequadas para acessar o repositório');
  }
  
  if (failedTests.some(t => t.id === 'workflow_exists')) {
    fixes.push('📄 Ativar as atualizações automáticas para criar os arquivos necessários');
  }
  
  if (failedTests.some(t => t.id === 'repo_permissions')) {
    fixes.push('⚙️ Configurar as permissões do GitHub Actions para permitir alterações automáticas');
  }
  
  if (tests.some(t => t.id === 'workflow_history' && t.status === 'fail')) {
    fixes.push('📊 Verificar os detalhes da última execução que falhou para identificar o problema');
  }
  
  return fixes;
}

// ═══ Mensagens de erro explicativas para usuários leigos ═══

function getEnvironmentErrorMessage(issues: string[]): string {
  const hasToken = issues.some(i => i.includes('GITHUB_TOKEN'));
  const hasOwner = issues.some(i => i.includes('GITHUB_OWNER'));
  const hasRepo = issues.some(i => i.includes('GITHUB_REPO'));
  const hasFormat = issues.some(i => i.includes('formato inválido'));

  if (hasFormat) {
    return '🔑 Problema com o token do GitHub: O token foi configurado mas está no formato incorreto. Tokens válidos começam com "ghp_".';
  }

  if (hasToken && hasOwner && hasRepo) {
    return '❌ Configuração incompleta: O sistema não consegue conectar com o GitHub porque as informações de acesso não foram configuradas na Vercel.';
  }

  if (hasToken) {
    return '🔑 Token do GitHub não encontrado: É necessário um "token de acesso" para que o sistema possa fazer atualizações automáticas no seu repositório.';
  }

  if (hasOwner || hasRepo) {
    return '📂 Informações do repositório incompletas: O sistema precisa saber qual é o seu usuário e repositório no GitHub.';
  }

  return `⚠️ Configuração necessária: ${issues.join(', ')}`;
}

function getEnvironmentSolutionMessage(issues: string[]): string {
  const hasToken = issues.some(i => i.includes('GITHUB_TOKEN'));
  const hasOwner = issues.some(i => i.includes('GITHUB_OWNER'));
  const hasFormat = issues.some(i => i.includes('formato inválido'));

  if (hasFormat) {
    return 'O token atual está incorreto. Crie um novo token no GitHub (deve começar com "ghp_") e substitua na Vercel.';
  }

  if (hasToken) {
    return 'Você precisa criar um "token" no GitHub e colocá-lo na Vercel. É como uma senha especial que permite atualizações automáticas.';
  }

  if (hasOwner) {
    return 'Configure seu nome de usuário e repositório do GitHub nas variáveis GITHUB_OWNER e GITHUB_REPO da Vercel.';
  }

  return 'Configure todas as variáveis necessárias na Vercel para conectar com o GitHub.';
}