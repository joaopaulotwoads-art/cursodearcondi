/**
 * SettingsAtualizacoes.tsx
 *
 * Componente React para ativar atualizações automáticas do template CNX.
 * Quando o usuário marca a opção e salva, o arquivo .github/workflows/sync-cnx.yml
 * é criado no repositório via GitHub API (o Deploy da Vercel não copia .github ao clonar).
 *
 * Em caso de falha (bug do GitHub: 404 em paths .github), exibe fallback manual com
 * link para criar o arquivo no GitHub e botão para copiar o conteúdo.
 */

import { useState, useEffect } from 'react';

type FallbackData = { createUrl: string; content: string } | null;

export default function SettingsAtualizacoes() {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [manualFallback, setManualFallback] = useState<FallbackData | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionsSettingsUrl, setActionsSettingsUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/site-settings').then((r) => r.json()),
      fetch('/api/admin/github-actions-url').then((r) => r.json()),
    ]).then(([siteRes, githubRes]) => {
      if (!cancelled && siteRes.success && typeof siteRes.data?.autoUpdateEnabled === 'boolean') {
        setAutoUpdateEnabled(siteRes.data.autoUpdateEnabled);
      }
      if (!cancelled && githubRes.success && githubRes.actionsSettingsUrl) {
        setActionsSettingsUrl(githubRes.actionsSettingsUrl);
      }
      if (!cancelled) setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

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
      let data: { success?: boolean; error?: string; manualFallback?: boolean };
      try {
        data = await res.json();
      } catch {
        setSaveStatus('error');
        setErrorMessage('📡 Resposta inválida do servidor. Tente novamente em alguns minutos.');
        setAutoUpdateEnabled(false);
        setLoading(false);
        return;
      }

      if (data.success) {
        setSaveStatus('success');
        setManualFallback(null);
        await saveSettings(true);
      } else {
        setSaveStatus('error');
        const err = data.error || '❌ Não foi possível ativar as atualizações automáticas. Verifique as configurações do GitHub na Vercel.';
        setErrorMessage(
          err.includes('GITHUB') || err.includes('variáveis') || err.includes('Configure') || err.includes('🔧')
            ? '🔧 Configuração necessária: Configure a conexão com o GitHub na Vercel. Vá em Ajuda → Primeiros passos para o passo-a-passo.'
            : err
        );
        setAutoUpdateEnabled(false);
        if (data.manualFallback || (err && /404/.test(err))) {
          fetch('/api/admin/workflow-fallback')
            .then((r) => r.json())
            .then((fb) => {
              if (fb.success && fb.createUrl && fb.content) {
                setManualFallback({ createUrl: fb.createUrl, content: fb.content });
              }
            })
            .catch(() => {});
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

  if (!loaded) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '640px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Descrição e permissões GitHub — sempre visível */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '0.5rem' }}>
          O que são atualizações?
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
          O CNX lança melhorias regularmente. Quando houver novidade, um <strong style={{ color: '#fcd34d' }}>banner amarelo</strong> aparece no topo do painel com o botão <strong>"🔄 Aplicar agora"</strong>. Seu conteúdo (posts, imagens) não é alterado — só o código do template.
        </p>
      </div>

      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.25)',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fcd34d', marginBottom: '0.5rem' }}>
          ⚠️ Permissões do GitHub (obrigatório)
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#e5e5e5', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          Para o workflow funcionar, ative as permissões no repositório:
        </p>
        <ol
          style={{
            margin: 0,
            paddingLeft: '1.25rem',
            fontSize: '0.85rem',
            color: '#94a3b8',
            lineHeight: 1.8,
          }}
        >
          <li>
            {actionsSettingsUrl ? (
              <>
                <a href={actionsSettingsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  Abra Actions → General no GitHub
                </a>
              </>
            ) : (
              <>Acesse o repositório no <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>GitHub</a>, depois Settings → Actions → General</>
            )}
          </li>
          <li>Em <strong style={{ color: '#e5e5e5' }}>Workflow permissions</strong>: marque <strong style={{ color: '#86efac' }}>Read and write permissions</strong></li>
          <li>Marque <strong style={{ color: '#86efac' }}>Allow GitHub Actions to create and approve pull requests</strong></li>
          <li>Clique em <strong style={{ color: '#86efac' }}>Save</strong></li>
        </ol>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${autoUpdateEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
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
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#e5e5e5',
            }}
          >
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

      {loading && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
          ⏳ Configurando workflow no repositório...
        </p>
      )}

      {saveStatus === 'success' && !loading && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#86efac',
            fontSize: '0.85rem',
          }}
        >
          ✅ Pronto. Você receberá as atualizações do template.
        </div>
      )}

      {saveStatus === 'error' && errorMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
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

      {manualFallback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
          }}
        >
          <p style={{ margin: '0 0 0.75rem', color: '#fcd34d', fontWeight: 600, fontSize: '0.9rem' }}>
            Siga os passos:
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              lineHeight: 1.8,
              color: '#e5e5e5',
              fontSize: '0.85rem',
            }}
          >
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

      {/* Como atualizar manualmente — sempre visível */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
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
