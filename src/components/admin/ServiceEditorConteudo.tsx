/**
 * ServiceEditorConteudo.tsx
 *
 * Aba "✍️ Conteúdo" do editor de Keywords (Serviços).
 * Interface simplificada para usuários leigos.
 *
 * Fluxo:
 *   1. Preview da outline definida (referência visual)
 *   2. Campo "O que torna seu serviço especial?" (diferenciais para a IA)
 *   3. Botão "✨ Gerar Conteúdo com IA"
 *   4. Editor de revisão do texto gerado
 *   5. Botão "💾 Salvar"
 *
 * FAQ gerado e exibido em seção dedicada (não no corpo do texto).
 * Tom de voz sempre transacional (padrão para páginas de serviço local).
 * Variáveis {servico}, {cidade}, {estado}, {empresa} substituídas em tempo real
 * na renderização de cada página /[bairro]/[servico].
 */

import { useState, useEffect } from 'react';

interface OutlineItem { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }

interface Props {
    serviceSlug:      string;
    initialOutline?:  OutlineItem[];
    initialContent?:  string;
    generatedAt?:     string;
    onSaved?():       void;
}

function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

const LEVEL_COLORS: Record<string, string> = {
    h1: '#6366f1', h2: '#3b82f6', h3: '#10b981', h4: '#f59e0b',
};

export default function ServiceEditorConteudo({ serviceSlug, initialOutline, initialContent, generatedAt, onSaved }: Props) {
    const [outline, setOutline]           = useState<OutlineItem[]>(initialOutline || []);
    const [content, setContent]           = useState(initialContent || '');
    const [diferenciais, setDiferenciais] = useState('');
    const [generating, setGenerating]     = useState(false);
    const [saving, setSaving]             = useState(false);
    const [msg, setMsg]                   = useState<{ text: string; type: 'ok' | 'err' | 'warn' } | null>(null);
    const [generatedNow, setGeneratedNow] = useState(false);

    useEffect(() => { setOutline(initialOutline || []); }, [initialOutline]);

    const hasOutline = outline.filter(o => o.text.trim()).length > 0;
    const words      = wordCount(content);

    async function handleGenerate() {
        if (!hasOutline) return;
        setGenerating(true); setMsg(null); setGeneratedNow(false);

        try {
            const res  = await fetch(`/api/admin/services/${serviceSlug}/generate-content`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    outline,
                    tone:       'profissional',
                    extras:     diferenciais,
                    includeFaq: true,
                    save:       false,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setContent(data.content);
                setGeneratedNow(true);
                setMsg({
                    text: data.usedAI
                        ? '✨ Conteúdo gerado! Leia o texto abaixo, ajuste se quiser e clique em Salvar.'
                        : '⚠️ Configure a API Key em Configurações → Inteligência Artificial (OpenAI ou Gemini) para gerar com IA.',
                    type: data.usedAI ? 'ok' : 'warn',
                });
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } catch {
            setMsg({ text: '❌ Erro ao conectar à API. Tente novamente.', type: 'err' });
        } finally {
            setGenerating(false);
        }
    }

    async function handleSave() {
        if (!content.trim()) return;
        setSaving(true); setMsg(null);

        try {
            const res  = await fetch(`/api/admin/services/${serviceSlug}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    generatedContent:   content,
                    contentGeneratedAt: new Date().toISOString().split('T')[0],
                    outline,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setMsg({ text: '✅ Conteúdo salvo! Todas as páginas /[bairro]/[servico] já usarão este texto.', type: 'ok' });
                setGeneratedNow(false);
                onSaved?.();
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setSaving(false);
        }
    }

    const msgStyle = {
        ok:   { bg: 'rgba(74,222,128,0.1)',  bdr: 'rgba(74,222,128,0.3)',  clr: '#4ade80' },
        err:  { bg: 'rgba(239,68,68,0.1)',   bdr: 'rgba(239,68,68,0.3)',   clr: '#f87171' },
        warn: { bg: 'rgba(245,158,11,0.1)',  bdr: 'rgba(245,158,11,0.3)',  clr: '#fbbf24' },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

            {/* ── Aviso: outline necessária ─────────────────────────────── */}
            {!hasOutline && (
                <div style={{ padding: '1.1rem 1.25rem', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.3rem' }}>
                        ⚠️ Defina a outline primeiro
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-subtle)', margin: 0 }}>
                        Volte para a aba <strong style={{ color: 'var(--admin-text)' }}>🔍 Outline</strong> e monte a estrutura da página antes de gerar o conteúdo.
                    </p>
                </div>
            )}

            {/* ── Preview da outline ────────────────────────────────────── */}
            {hasOutline && (
                <div className="admin-card" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                        Estrutura que a IA vai usar
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {outline.filter(o => o.text.trim()).map((o, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: { h1: 0, h2: 0, h3: 16, h4: 32 }[o.level] }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: LEVEL_COLORS[o.level], flexShrink: 0, width: 20 }}>{o.level.toUpperCase()}</span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--admin-text)' }}>{o.text}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid var(--admin-border)' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', flexShrink: 0, width: 20 }}>H2</span>
                            <span style={{ fontSize: '0.82rem', color: '#737373', fontStyle: 'italic' }}>FAQ — exibido em área separada ✓</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Campo de diferenciais ─────────────────────────────────── */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '0.3rem' }}>
                    💡 O que torna seu serviço especial? <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--admin-text-subtle)' }}>(opcional)</span>
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', marginBottom: '0.75rem' }}>
                    Escreva detalhes que a IA vai destacar no texto. Quanto mais específico, melhor o resultado.
                </p>
                <textarea
                    className="admin-input"
                    value={diferenciais}
                    onChange={e => setDiferenciais(e.target.value)}
                    rows={3}
                    placeholder="Ex: atendemos 24h inclusive feriados, aluguel mínimo de 24h, entrega e instalação inclusa, geradores com silenciador para eventos, aceitamos cartão..."
                    style={{ fontSize: '0.875rem', resize: 'vertical' }}
                />
            </div>

            {/* ── Botão gerar / regenerar ─────────────────────────────────── */}
            <div>
                <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleGenerate}
                    disabled={generating || !hasOutline}
                    style={{ fontSize: '1rem', padding: '0.9rem 2.5rem', opacity: !hasOutline ? 0.5 : 1 }}
                >
                    {generating
                        ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}>⏳</span> Gerando...</>
                        : content ? '🔄 Regenerar copy' : '✨ Gerar Conteúdo com IA'}
                </button>
                {content && hasOutline && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', marginTop: '0.5rem', marginBottom: 0 }}>
                        Regenerar mantém a mesma outline e cria um novo texto.
                    </p>
                )}
            </div>

            {/* ── Feedback ─────────────────────────────────────────────── */}
            {msg && (
                <div style={{ padding: '0.85rem 1rem', borderRadius: 8, background: msgStyle[msg.type].bg, border: `1px solid ${msgStyle[msg.type].bdr}`, color: msgStyle[msg.type].clr, fontSize: '0.875rem' }}>
                    {msg.text}
                </div>
            )}

            {/* ── Editor de revisão ─────────────────────────────────────── */}
            {content && (
                <div className="admin-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
                                {generatedNow ? '✨ Texto gerado — leia e ajuste se quiser' : '📄 Conteúdo atual'}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', margin: 0 }}>
                                {words} palavras{generatedAt && !generatedNow ? ` · gerado em ${generatedAt}` : ''}
                            </p>
                        </div>
                        {content && (
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                                style={{ fontSize: '0.875rem' }}
                            >
                                {saving ? '⏳ Salvando...' : '💾 Salvar Conteúdo'}
                            </button>
                        )}
                    </div>

                    <textarea
                        className="admin-input"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={22}
                        style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical', lineHeight: 1.75 }}
                    />

                    <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', marginTop: '0.5rem' }}>
                        💡 <strong style={{ color: 'var(--admin-text)' }}>{'{cidade}'}</strong>, <strong style={{ color: 'var(--admin-text)' }}>{'{servico}'}</strong> e <strong style={{ color: 'var(--admin-text)' }}>{'{empresa}'}</strong> são substituídos automaticamente em cada bairro — não altere essas palavras.
                    </p>
                </div>
            )}
        </div>
    );
}
