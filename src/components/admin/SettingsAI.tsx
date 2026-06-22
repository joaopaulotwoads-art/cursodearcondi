/**
 * SettingsAI.tsx
 *
 * Componente React para configuração do provedor de IA (OpenAI ou Gemini).
 * Permite ao usuário:
 *   - Selecionar o provedor principal: OpenAI (pago) ou Google Gemini (gratuito)
 *   - Inserir e salvar a API Key correspondente
 *   - Testar se a chave está funcionando com uma chamada mínima
 *   - Visualizar o status atual da configuração
 *
 * A chave é salva em settings.yaml via PUT /api/admin/site-settings.
 * Exibe aviso de segurança recomendando repositório privado.
 */

import { useState, useEffect } from 'react';

type AIProvider = 'openai' | 'gemini';

interface AISettings {
    aiProvider: AIProvider;
    aiApiKey: string;
    pexelsApiKey?: string;
}

interface TestResult {
    ok: boolean;
    message: string;
}

const PROVIDERS = [
    {
        id: 'gemini' as AIProvider,
        name: 'Google Gemini',
        badge: 'GRATUITO',
        badgeColor: '#16a34a',
        description: 'Gemini 1.5 Flash — generoso plano gratuito, ideal para começar.',
        icon: '🟢',
        docsUrl: 'https://aistudio.google.com/app/apikey',
        docsLabel: 'Obter chave gratuita no Google AI Studio',
        placeholder: 'AIzaSy...',
    },
    {
        id: 'openai' as AIProvider,
        name: 'OpenAI',
        badge: 'PAGO',
        badgeColor: '#d97706',
        description: 'GPT-4o Mini — alta qualidade, requer saldo na conta OpenAI.',
        icon: '⚡',
        docsUrl: 'https://platform.openai.com/api-keys',
        docsLabel: 'Obter chave na plataforma OpenAI',
        placeholder: 'sk-...',
    },
];

export default function SettingsAI() {
    const [provider, setProvider]       = useState<AIProvider>('gemini');
    const [apiKey, setApiKey]           = useState('');
    const [pexelsApiKey, setPexelsApiKey] = useState('');
    const [showKey, setShowKey]         = useState(false);
    const [showPexelsKey, setShowPexelsKey] = useState(false);
    const [saving, setSaving]           = useState(false);
    const [testing, setTesting]         = useState(false);
    const [testResult, setTestResult]   = useState<TestResult | null>(null);
    const [saveStatus, setSaveStatus]   = useState<'idle' | 'success' | 'error'>('idle');
    const [loaded, setLoaded]           = useState(false);

    useEffect(() => {
        fetch('/api/admin/site-settings')
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setProvider(res.data.aiProvider || 'gemini');
                    setApiKey(res.data.aiApiKey || '');
                    setPexelsApiKey(res.data.pexelsApiKey || '');
                }
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaveStatus('idle');
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/site-settings', {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ aiProvider: provider, aiApiKey: apiKey, pexelsApiKey: pexelsApiKey }),
            });
            const data = await res.json();
            setSaveStatus(data.success ? 'success' : 'error');
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }

    async function handleTest() {
        if (!apiKey.trim()) {
            setTestResult({ ok: false, message: 'Insira uma API Key antes de testar.' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/test-ai-key', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ provider, apiKey }),
            });
            const data = await res.json();
            setTestResult({ ok: data.success, message: data.message });
        } catch {
            setTestResult({ ok: false, message: 'Erro ao testar — verifique se o servidor está rodando.' });
        } finally {
            setTesting(false);
        }
    }

    if (!loaded) {
        return (
            <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
                Carregando configurações...
            </div>
        );
    }

    const currentProvider = PROVIDERS.find(p => p.id === provider)!;

    return (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Aviso de segurança */}
            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(234,179,8,0.08)',
                border: '1px solid rgba(234,179,8,0.3)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
            }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
                <div>
                    <p style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Repositório Privado Obrigatório
                    </p>
                    <p style={{ color: '#a3a3a3', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        Sua API Key será salva no arquivo <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1em 0.4em', borderRadius: '4px' }}>settings.yaml</code> do repositório.
                        Certifique-se de que o repositório é <strong style={{ color: '#e5e5e5' }}>privado</strong> no GitHub antes de salvar.
                    </p>
                </div>
            </div>

            {/* Seleção de provedor */}
            <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a3a3a3', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Provedor de IA
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {PROVIDERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { setProvider(p.id); setTestResult(null); }}
                            style={{
                                padding: '1rem',
                                borderRadius: '10px',
                                border: `2px solid ${provider === p.id ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.08)'}`,
                                background: provider === p.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
                                <span style={{ fontWeight: 700, color: '#e5e5e5', fontSize: '0.9rem' }}>{p.name}</span>
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '0.15em 0.5em',
                                    borderRadius: '999px',
                                    background: `${p.badgeColor}22`,
                                    color: p.badgeColor,
                                    border: `1px solid ${p.badgeColor}44`,
                                }}>
                                    {p.badge}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.775rem', color: '#71717a', lineHeight: 1.5, margin: 0 }}>
                                {p.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Campo API Key */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        API Key — {currentProvider.name}
                    </label>
                    <a
                        href={currentProvider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--primary, #6366f1)', textDecoration: 'none' }}
                    >
                        {currentProvider.docsLabel} ↗
                    </a>
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
                        placeholder={currentProvider.placeholder}
                        style={{
                            width: '100%',
                            padding: '0.75rem 3rem 0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#e5e5e5',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                        }}
                    />
                    <button
                        onClick={() => setShowKey(v => !v)}
                        title={showKey ? 'Ocultar' : 'Mostrar'}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#71717a',
                            fontSize: '1rem',
                            padding: '0.25rem',
                        }}
                    >
                        {showKey ? '🙈' : '👁️'}
                    </button>
                </div>
                {apiKey && (
                    <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.35rem' }}>
                        {apiKey.length} caracteres · {showKey ? 'visível' : 'oculto'}
                    </p>
                )}
            </div>

            {/* Campo Pexels API Key — imagens em posts gerados por IA */}
            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(5,160,129,0.06)',
                border: '1px solid rgba(5,160,129,0.2)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        API Key — Pexels (imagens)
                    </label>
                    <a
                        href="https://www.pexels.com/api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: '#05a081', textDecoration: 'none' }}
                    >
                        Obter chave gratuita no Pexels ↗
                    </a>
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        type={showPexelsKey ? 'text' : 'password'}
                        value={pexelsApiKey}
                        onChange={e => setPexelsApiKey(e.target.value)}
                        placeholder="Chave da API Pexels (opcional)"
                        style={{
                            width: '100%',
                            padding: '0.75rem 3rem 0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#e5e5e5',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                        }}
                    />
                    <button
                        onClick={() => setShowPexelsKey(v => !v)}
                        title={showPexelsKey ? 'Ocultar' : 'Mostrar'}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#71717a',
                            fontSize: '1rem',
                            padding: '0.25rem',
                        }}
                    >
                        {showPexelsKey ? '🙈' : '👁️'}
                    </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.35rem' }}>
                    Usada para inserir imagens automaticamente nos posts gerados por IA (1 a cada ~400 palavras, máx. 5).
                </p>
            </div>

            {/* Resultado do teste */}
            {testResult && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: testResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: testResult.ok ? '#4ade80' : '#f87171',
                    fontSize: '0.875rem',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                }}>
                    <span>{testResult.ok ? '✅' : '❌'}</span>
                    <span>{testResult.message}</span>
                </div>
            )}

            {/* Botões de ação */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                    onClick={handleTest}
                    disabled={testing || !apiKey.trim()}
                    style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#e5e5e5',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: testing || !apiKey.trim() ? 'not-allowed' : 'pointer',
                        opacity: !apiKey.trim() ? 0.5 : 1,
                        transition: 'all 0.15s',
                    }}
                >
                    {testing ? '⏳ Testando...' : '🧪 Testar Chave'}
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        background: saveStatus === 'success' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : 'var(--primary, #6366f1)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        border: 'none',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                    }}
                >
                    {saving
                        ? '⏳ Salvando...'
                        : saveStatus === 'success'
                        ? '✅ Salvo!'
                        : saveStatus === 'error'
                        ? '❌ Erro ao salvar'
                        : '💾 Salvar Configurações'}
                </button>
            </div>

            {/* Status atual da configuração */}
            <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
            }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                    Status atual
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#71717a' }}>Provedor</span>
                        <span style={{ color: '#e5e5e5', fontWeight: 600 }}>{currentProvider.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#71717a' }}>API Key IA</span>
                        <span style={{ color: apiKey ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            {apiKey ? '● Configurada' : '○ Não configurada'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#71717a' }}>Pexels (imagens)</span>
                        <span style={{ color: pexelsApiKey ? '#4ade80' : '#71717a', fontWeight: 600 }}>
                            {pexelsApiKey ? '● Configurada' : '○ Opcional'}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}
