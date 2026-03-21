/**
 * SettingsAtualizacoesV2.tsx
 * 
 * Versão melhorada do componente de atualizações com:
 * - Sistema de validações automáticas
 * - Diagnóstico inteligente de problemas
 * - Wizard passo-a-passo para configuração
 * - Status visual em tempo real
 * - Soluções automáticas para problemas comuns
 */

import { useState, useEffect } from 'react';

type SystemCheck = {
  hasGitHubToken: boolean;
  hasRepoVars: boolean;
  workflowExists: boolean;
  permissionsEnabled: boolean;
  canCreatePR: boolean;
  lastUpdateStatus: { success: boolean; lastRun?: string; error?: string; };
};

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
};

type FallbackData = { createUrl: string; content: string } | null;

export default function SettingsAtualizacoesV2() {
  // Estados originais
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [manualFallback, setManualFallback] = useState<FallbackData | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Novos estados para validações
  const [systemCheck, setSystemCheck] = useState<SystemCheck | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticTest[] | null>(null);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [actionsSettingsUrl, setActionsSettingsUrl] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    Promise.all([
      fetch('/api/admin/site-settings').then((r) => r.json()),
      fetch('/api/admin/update-system-check').then((r) => r.json()),
      fetch('/api/admin/github-actions-url').then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([siteRes, checkRes, githubRes]) => {
      if (cancelled) return;
      
      if (siteRes.success && typeof siteRes.data?.autoUpdateEnabled === 'boolean') {
        setAutoUpdateEnabled(siteRes.data.autoUpdateEnabled);
      }
      
      if (checkRes.success) {
        setSystemCheck(checkRes.checks);
        if (checkRes.actionsUrl) {
          setActionsSettingsUrl(checkRes.actionsUrl);
        }
      }
      
      if (githubRes.success && githubRes.actionsSettingsUrl) {
        setActionsSettingsUrl(githubRes.actionsSettingsUrl);
      }
      
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    
    return () => { cancelled = true; };
  }, []);

  // Função para executar diagnósticos
  async function runDiagnostics() {
    setDiagnosticRunning(true);
    
    try {
      const res = await fetch('/api/admin/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnosticResults(data.report.tests);
      }
    } catch (error) {
      console.error('Erro ao executar diagnósticos:', error);
    } finally {
      setDiagnosticRunning(false);
    }
  }

  // Função para ativar/desativar atualizações
  async function handleToggle() {
    const next = !autoUpdateEnabled;
    setAutoUpdateEnabled(next);

    if (!next) {
      await saveSettings(false);
      return;
    }

    setLoading(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/ensure-workflow', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSaveStatus('success');
        setManualFallback(null);
        await saveSettings(true);
        // Atualizar verificações do sistema
        const checkRes = await fetch('/api/admin/update-system-check');
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          setSystemCheck(checkData.checks);
        }
      } else {
        setSaveStatus('error');
        const err = data.error || '❌ Não foi possível ativar as atualizações automáticas. Verifique as configurações do GitHub na Vercel.';
        setErrorMessage(err);
        setAutoUpdateEnabled(false);
        
        if (data.manualFallback || (err && /404/.test(err))) {
          const fallbackRes = await fetch('/api/admin/workflow-fallback');
          if (fallbackRes.ok) {
            const fb = await fallbackRes.json();
            if (fb.success && fb.createUrl && fb.content) {
              setManualFallback({ createUrl: fb.createUrl, content: fb.content });
            }
          }
        } else {
          setManualFallback(null);
        }
      }
    } catch (e) {
      setSaveStatus('error');
      setErrorMessage('🌐 Problema de conexão: Verifique sua internet e tente novamente em alguns minutos.');
      setAutoUpdateEnabled(false);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSaveStatus((s) => (s === 'error' ? 'idle' : s));
        setErrorMessage('');
      }, 8000);
    }
  }

  async function saveSettings(enabled: boolean) {
    try {
      await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoUpdateEnabled: enabled }),
      });
    } catch {
      /* ignorar */
    }
  }

  // Componente de item de status
  function StatusItem({ title, status, description, action, link }: {
    title: string;
    status: boolean;
    description: string;
    action?: string;
    link?: string;
  }) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '8px',
        background: status ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
        border: `1px solid ${status ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}>
        <div style={{ 
          fontSize: '1.25rem',
          flexShrink: 0,
        }}>
          {status ? '✅' : '❌'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 600, 
            color: status ? '#86efac' : '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '0.25rem'
          }}>
            {title}
          </div>
          <div style={{ 
            color: '#94a3b8', 
            fontSize: '0.8rem',
            lineHeight: 1.4
          }}>
            {description}
          </div>
        </div>
        {!status && action && link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--primary, #6366f1)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {action}
          </a>
        )}
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '640px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      
      {/* Sistema de Status Visual */}
      {systemCheck && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e5e5e5', margin: 0 }}>
              🔍 Status do Sistema
            </h3>
            <button
              onClick={runDiagnostics}
              disabled={diagnosticRunning}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#c7d2fe',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: diagnosticRunning ? 'not-allowed' : 'pointer',
                opacity: diagnosticRunning ? 0.7 : 1,
              }}
            >
              {diagnosticRunning ? '⏳ Verificando...' : '🔍 Diagnosticar'}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <StatusItem
              title="Variáveis GitHub"
              status={systemCheck.hasGitHubToken && systemCheck.hasRepoVars}
              description={systemCheck.hasGitHubToken && systemCheck.hasRepoVars 
                ? "GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO configurados"
                : "Configure as variáveis de ambiente na Vercel"
              }
              action="Configurar"
              link="/admin/ajuda#variaveis"
            />
            
            <StatusItem
              title="Arquivo de Workflow"
              status={systemCheck.workflowExists}
              description={systemCheck.workflowExists 
                ? ".github/workflows/sync-cnx.yml existe e está configurado"
                : "Arquivo de workflow precisa ser criado"
              }
              action="Criar"
              link={showWizard ? undefined : '/admin/configuracoes/atualizacoes'}
            />
            
            <StatusItem
              title="Permissões GitHub Actions"
              status={systemCheck.permissionsEnabled}
              description={systemCheck.permissionsEnabled 
                ? "Read and write permissions estão ativadas"
                : "Ative as permissões necessárias no GitHub"
              }
              action="Configurar"
              link={actionsSettingsUrl || `https://github.com/settings`}
            />
            
            <StatusItem
              title="Última Atualização"
              status={systemCheck.lastUpdateStatus.success}
              description={systemCheck.lastUpdateStatus.success 
                ? `Última execução bem-sucedida ${systemCheck.lastUpdateStatus.lastRun ? 
                  new Date(systemCheck.lastUpdateStatus.lastRun).toLocaleDateString('pt-BR') : ''}`
                : systemCheck.lastUpdateStatus.error || "Workflow nunca foi executado com sucesso"
              }
            />
          </div>
        </div>
      )}

      {/* Resultados do Diagnóstico */}
      {diagnosticResults && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fcd34d', marginBottom: '1rem' }}>
            📊 Relatório de Diagnóstico
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {diagnosticResults.map(test => (
              <div key={test.id} style={{
                padding: '0.75rem',
                borderRadius: '6px',
                background: test.status === 'pass' ? 'rgba(34,197,94,0.05)' : 
                           test.status === 'warning' ? 'rgba(251,191,36,0.05)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${test.status === 'pass' ? 'rgba(34,197,94,0.2)' : 
                                   test.status === 'warning' ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.125rem' }}>
                    {test.status === 'pass' ? '✅' : test.status === 'warning' ? '⚠️' : '❌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: test.status === 'pass' ? '#86efac' : 
                             test.status === 'warning' ? '#fcd34d' : '#fca5a5',
                      fontSize: '0.85rem',
                      marginBottom: '0.25rem'
                    }}>
                      {test.name}
                    </div>
                    <div style={{ 
                      color: '#94a3b8', 
                      fontSize: '0.8rem',
                      lineHeight: 1.4,
                      marginBottom: test.solution ? '0.5rem' : 0
                    }}>
                      {test.details}
                    </div>
                    
                    {test.solution && (
                      <div style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)'
                      }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: '#c7d2fe', 
                          fontSize: '0.8rem',
                          marginBottom: '0.25rem'
                        }}>
                          💡 {test.solution.title}
                        </div>
                        <div style={{ 
                          color: '#94a3b8', 
                          fontSize: '0.75rem',
                          marginBottom: test.solution.link ? '0.5rem' : 0
                        }}>
                          {test.solution.description}
                        </div>
                        
                        {test.solution.link && (
                          <a
                            href={test.solution.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              background: 'var(--primary, #6366f1)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            {test.solution.action}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Descrição das atualizações */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '10px',
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '0.5rem' }}>
          O que são atualizações?
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
          O CNX lança melhorias regularmente. Quando houver novidade, um <strong style={{ color: '#fcd34d' }}>banner amarelo</strong> aparece no topo do painel com o botão <strong>"🔄 Aplicar agora"</strong>. Seu conteúdo (posts, imagens) não é alterado — só o código do template.
        </p>
      </div>

      {/* Controles de ativação */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${autoUpdateEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}>
          <input
            type="checkbox"
            checked={autoUpdateEnabled}
            onChange={handleToggle}
            disabled={loading}
            style={{
              width: '1.25rem',
              height: '1.25rem',
              minWidth: '1.25rem',
              minHeight: '1.25rem',
              accentColor: 'var(--primary, #6366f1)',
              cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#e5e5e5',
          }}>
            Ativar para receber atualizações do template
          </span>
        </label>

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          style={{
            padding: '0.875rem 1.5rem',
            borderRadius: '10px',
            background: autoUpdateEnabled ? 'rgba(34,197,94,0.2)' : 'var(--primary, #6366f1)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            border: `1px solid ${autoUpdateEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.5)'}`,
            alignSelf: 'flex-start',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? '⏳ Configurando...'
            : autoUpdateEnabled
              ? '✅ Ativado'
              : '🔄 Ativar'}
        </button>
      </div>

      {/* Status de loading e sucesso/erro */}
      {loading && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
          ⏳ Configurando workflow no repositório...
        </p>
      )}

      {saveStatus === 'success' && !loading && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.25)',
          color: '#86efac',
          fontSize: '0.85rem',
        }}>
          ✅ Pronto. Você receberá as atualizações do template.
        </div>
      )}

      {saveStatus === 'error' && errorMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5',
          fontSize: '0.85rem',
        }}>
          ❌ {errorMessage}
          {errorMessage.includes('Ajuda') && !manualFallback && (
            <a
              href="/admin/ajuda"
              style={{
                display: 'block',
                marginTop: '0.5rem',
                color: '#fbbf24',
                textDecoration: 'underline',
              }}
            >
              Abrir Ajuda →
            </a>
          )}
        </div>
      )}

      {/* Fallback manual */}
      {manualFallback && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <p style={{ margin: '0 0 0.75rem', color: '#fcd34d', fontWeight: 600, fontSize: '0.9rem' }}>
            Siga os passos:
          </p>
          <ol style={{
            margin: 0,
            paddingLeft: '1.25rem',
            lineHeight: 1.8,
            color: '#e5e5e5',
            fontSize: '0.85rem',
          }}>
            <li>
              <a
                href={manualFallback.createUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                Abra este link no GitHub
              </a>
            </li>
            <li>
              Clique em <strong style={{ color: '#86efac' }}>📋 Copiar conteúdo</strong> abaixo,
              cole no editor do GitHub e clique em{' '}
              <strong style={{ color: '#86efac' }}>Commit new file</strong>
            </li>
            <li>
              Configure as permissões: {actionsSettingsUrl ? (
                <>
                  <a href={actionsSettingsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>abra este link</a>
                  {' '}→ marque <strong style={{ color: '#86efac' }}>Read and write permissions</strong> e{' '}
                  <strong style={{ color: '#86efac' }}>Allow GitHub Actions to create and approve pull requests</strong> → <strong>Save</strong>
                </>
              ) : (
                <>
                  <strong style={{ color: '#e5e5e5' }}>Settings → Actions → General</strong> →
                  marque <strong style={{ color: '#86efac' }}>Read and write permissions</strong> e{' '}
                  <strong style={{ color: '#86efac' }}>Allow GitHub Actions to create and approve pull requests</strong> → <strong>Save</strong>
                </>
              )}
            </li>
            <li>Volte aqui e clique em Ativar novamente</li>
          </ol>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(manualFallback.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: 'var(--primary, #6366f1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              📋 Copiar conteúdo
            </button>
            {copied && <span style={{ color: '#86efac', fontSize: '0.85rem' }}>Copiado!</span>}
          </div>
        </div>
      )}

      {/* Como atualizar manualmente */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '0.5rem' }}>
          Como atualizar manualmente pelo GitHub
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
          No repositório: aba <strong style={{ color: '#e5e5e5' }}>Actions</strong> →{' '}
          <strong style={{ color: '#e5e5e5' }}>🔄 Atualizar Template CNX</strong> → <strong style={{ color: '#86efac' }}>Run workflow</strong>.
        </p>
      </div>
    </div>
  );
}