/**
 * UpdateSetupWizard.tsx
 * 
 * Wizard passo-a-passo para configurar o sistema de atualizações.
 * Guia o usuário através de cada etapa necessária com validações
 * em tempo real e links diretos para ações.
 */

import { useState, useEffect } from 'react';

type WizardStep = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  required: boolean;
  action?: () => void | Promise<void>;
  link?: string;
  validation?: () => Promise<boolean>;
};

type SystemCheck = {
  hasGitHubToken: boolean;
  hasRepoVars: boolean;
  workflowExists: boolean;
  permissionsEnabled: boolean;
  canCreatePR: boolean;
  lastUpdateStatus: { success: boolean; lastRun?: string; error?: string; };
};

export default function UpdateSetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [systemCheck, setSystemCheck] = useState<SystemCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionsUrl, setActionsUrl] = useState<string | null>(null);

  // Definir os passos do wizard
  const [steps, setSteps] = useState<WizardStep[]>([
    {
      id: 'env_vars',
      title: 'Configurar Variáveis de Ambiente',
      description: 'Configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO na Vercel',
      status: 'pending',
      required: true,
      link: 'https://vercel.com/dashboard',
    },
    {
      id: 'workflow',
      title: 'Criar Arquivo de Workflow',
      description: 'Criar .github/workflows/sync-cnx.yml no repositório',
      status: 'pending',
      required: true,
      action: async () => {
        const res = await fetch('/api/admin/ensure-workflow', { method: 'POST' });
        const data = await res.json();
        return data.success;
      },
    },
    {
      id: 'permissions',
      title: 'Configurar Permissões do GitHub Actions',
      description: 'Ativar "Read and write permissions" e "Allow GitHub Actions to create and approve pull requests"',
      status: 'pending',
      required: true,
    },
    {
      id: 'test',
      title: 'Executar Teste de Atualização',
      description: 'Testar se o sistema funciona executando uma atualização',
      status: 'pending',
      required: false,
      action: async () => {
        const res = await fetch('/api/admin/version/update', { method: 'POST' });
        const data = await res.json();
        return data.success;
      },
    }
  ]);

  // Carregar status inicial
  useEffect(() => {
    loadSystemStatus();
  }, []);

  // Atualizar status dos passos quando systemCheck muda
  useEffect(() => {
    if (systemCheck) {
      updateStepsStatus();
    }
  }, [systemCheck]);

  async function loadSystemStatus() {
    try {
      const res = await fetch('/api/admin/update-system-check');
      if (res.ok) {
        const data = await res.json();
        setSystemCheck(data.checks);
        if (data.actionsUrl) {
          setActionsUrl(data.actionsUrl);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  }

  function updateStepsStatus() {
    if (!systemCheck) return;

    setSteps(prevSteps => prevSteps.map(step => {
      let newStatus = step.status;
      
      switch (step.id) {
        case 'env_vars':
          newStatus = (systemCheck.hasGitHubToken && systemCheck.hasRepoVars) ? 'completed' : 'pending';
          break;
        case 'workflow':
          newStatus = systemCheck.workflowExists ? 'completed' : 'pending';
          break;
        case 'permissions':
          newStatus = systemCheck.permissionsEnabled ? 'completed' : 'pending';
          if (actionsUrl) {
            return { ...step, status: newStatus, link: actionsUrl };
          }
          break;
        case 'test':
          newStatus = systemCheck.lastUpdateStatus.success ? 'completed' : 'pending';
          break;
      }
      
      return { ...step, status: newStatus };
    }));

    // Avançar automaticamente para o próximo passo incompleto
    const nextIncompleteStep = steps.findIndex(step => 
      step.status !== 'completed' && step.required
    );
    if (nextIncompleteStep !== -1 && currentStep !== nextIncompleteStep) {
      setCurrentStep(nextIncompleteStep);
    }
  }

  async function executeStepAction(stepIndex: number) {
    const step = steps[stepIndex];
    if (!step.action) return;

    setLoading(true);
    setSteps(prevSteps => prevSteps.map((s, i) => 
      i === stepIndex ? { ...s, status: 'in_progress' } : s
    ));

    try {
      const success = await step.action();
      
      setSteps(prevSteps => prevSteps.map((s, i) => 
        i === stepIndex ? { 
          ...s, 
          status: success ? 'completed' : 'failed' 
        } : s
      ));

      if (success) {
        // Recarregar status do sistema
        await loadSystemStatus();
        // Avançar para próximo passo
        if (stepIndex < steps.length - 1) {
          setCurrentStep(stepIndex + 1);
        }
      }
    } catch (error) {
      setSteps(prevSteps => prevSteps.map((s, i) => 
        i === stepIndex ? { ...s, status: 'failed' } : s
      ));
    } finally {
      setLoading(false);
    }
  }

  function getStepIcon(status: WizardStep['status']) {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'failed': return '❌';
      default: return '⭕';
    }
  }

  function getStepColor(status: WizardStep['status']) {
    switch (status) {
      case 'completed': return '#86efac';
      case 'in_progress': return '#fcd34d';
      case 'failed': return '#fca5a5';
      default: return '#94a3b8';
    }
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div style={{
      maxWidth: '600px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      
      {/* Header com progresso */}
      <div style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          margin: '0 0 0.5rem', 
          color: '#e5e5e5', 
          fontSize: '1.25rem',
          fontWeight: 700 
        }}>
          🧙‍♂️ Assistente de Configuração
        </h2>
        <p style={{ 
          margin: '0 0 1rem', 
          color: '#94a3b8', 
          fontSize: '0.9rem' 
        }}>
          Vamos configurar seu sistema de atualizações passo a passo
        </p>
        
        {/* Barra de progresso */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
            height: '100%',
            width: `${progress}%`,
            transition: 'width 0.3s ease',
            borderRadius: '8px'
          }} />
        </div>
        <p style={{ 
          margin: '0.5rem 0 0', 
          color: '#c7d2fe', 
          fontSize: '0.8rem' 
        }}>
          {completedSteps} de {totalSteps} passos concluídos ({Math.round(progress)}%)
        </p>
      </div>

      {/* Lista de passos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const canExecute = step.action && step.status === 'pending';
          
          return (
            <div
              key={step.id}
              style={{
                padding: '1.25rem',
                borderRadius: '10px',
                background: isActive 
                  ? 'rgba(99,102,241,0.08)' 
                  : 'rgba(255,255,255,0.02)',
                border: `2px solid ${isActive 
                  ? 'rgba(99,102,241,0.3)' 
                  : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem'
              }}>
                {/* Ícone do passo */}
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: isActive 
                    ? 'rgba(99,102,241,0.2)' 
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${getStepColor(step.status)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}>
                  {getStepIcon(step.status)}
                </div>

                {/* Conteúdo do passo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#e5e5e5',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}>
                      {index + 1}. {step.title}
                    </h3>
                    
                    {step.required && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(239,68,68,0.15)',
                        color: '#fca5a5',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Obrigatório
                      </span>
                    )}
                  </div>
                  
                  <p style={{
                    margin: '0 0 1rem',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    lineHeight: 1.5
                  }}>
                    {step.description}
                  </p>

                  {/* Ações do passo */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    {canExecute && (
                      <button
                        onClick={() => executeStepAction(index)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          background: 'var(--primary, #6366f1)',
                          color: '#fff',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.7 : 1
                        }}
                      >
                        {step.status === 'in_progress' ? '⏳ Executando...' : '▶️ Executar'}
                      </button>
                    )}
                    
                    {step.link && step.status !== 'completed' && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          background: 'rgba(251,191,36,0.15)',
                          color: '#fcd34d',
                          border: '1px solid rgba(251,191,36,0.3)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        🔗 Abrir Link
                      </a>
                    )}

                    {isActive && step.status === 'pending' && !canExecute && (
                      <button
                        onClick={() => loadSystemStatus()}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          background: 'rgba(34,197,94,0.15)',
                          color: '#86efac',
                          border: '1px solid rgba(34,197,94,0.3)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🔄 Verificar Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer com dicas */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        background: 'rgba(34,197,94,0.05)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.75rem' 
        }}>
          <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</div>
          <div>
            <h4 style={{ 
              margin: '0 0 0.5rem', 
              color: '#86efac', 
              fontSize: '0.9rem',
              fontWeight: 600 
            }}>
              Dicas para o sucesso:
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1rem', 
              color: '#94a3b8', 
              fontSize: '0.85rem',
              lineHeight: 1.6
            }}>
              <li>Complete os passos na ordem apresentada</li>
              <li>Use os links diretos para abrir as páginas corretas</li>
              <li>Aguarde as verificações automáticas após cada passo</li>
              <li>Se algo falhar, tente executar novamente após verificar as configurações</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status de conclusão */}
      {completedSteps === totalSteps && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.1) 100%)',
          border: '2px solid rgba(34,197,94,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <h3 style={{ 
            margin: '0 0 0.5rem', 
            color: '#86efac', 
            fontSize: '1.1rem',
            fontWeight: 700 
          }}>
            Configuração Concluída!
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#94a3b8', 
            fontSize: '0.9rem' 
          }}>
            Seu sistema de atualizações está pronto. Você receberá as melhorias automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}