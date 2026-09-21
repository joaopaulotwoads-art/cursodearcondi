/**
 * ServiceEditorOutline.tsx
 *
 * Aba "🔍 Outline" do editor de Keywords (Serviços).
 * Permite ao usuário:
 *   1. Extrair outline de concorrentes (análise por URL)
 *   2. Editar a outline manualmente (adicionar, reordenar, remover seções)
 *   3. Salvar a outline no serviço
 *
 * A outline define a estrutura da página /[bairro]/[servico] que será gerada.
 * Ao ser combinada com IA na aba Conteúdo, gera texto único por localidade.
 *
 * Fluxo:
 *   Cola URLs → Analisar → Ver frequência por heading → Selecionar → Editar → Salvar
 */

import { useState, useCallback } from 'react';

interface OutlineItem { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }
interface Heading     { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }

interface UrlResult {
    url:       string;
    status:    'success' | 'cached' | 'partial' | 'blocked' | 'timeout' | 'invalid';
    title:     string;
    headings:  Heading[];
    error?:    string;
}
interface ConsolidatedItem {
    level:     'h1' | 'h2' | 'h3' | 'h4';
    text:      string;
    frequency: number;
    urls:      string[];
}

interface Props {
    serviceSlug:     string;
    initialOutline?: OutlineItem[];
    onSaved?(savedOutline: OutlineItem[]): void;
}

const STATUS_ICON: Record<string, string> = {
    success: '✅', cached: '🔄', partial: '⚠️', blocked: '❌', timeout: '⏱️', invalid: '🚫',
};
const STATUS_LABEL: Record<string, string> = {
    success: 'Extraído', cached: 'Cache do Google', partial: 'Parcial (SPA)', blocked: 'Bloqueado', timeout: 'Timeout', invalid: 'URL inválida',
};
const LEVEL_COLORS: Record<string, string> = {
    h1: '#6366f1', h2: '#3b82f6', h3: '#10b981', h4: '#f59e0b',
};

function hostname(url: string) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

export default function ServiceEditorOutline({ serviceSlug, initialOutline, onSaved }: Props) {
    const [outline, setOutline]         = useState<OutlineItem[]>(initialOutline || []);
    const [urls, setUrls]               = useState<string[]>(['', '', '']);
    const [analyzing, setAnalyzing]     = useState(false);
    const [results, setResults]         = useState<UrlResult[]>([]);
    const [consolidated, setConsolidated] = useState<ConsolidatedItem[]>([]);
    const [selected, setSelected]       = useState<Set<string>>(new Set());
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [saving, setSaving]           = useState(false);
    const [msg, setMsg]                 = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

    // ── Análise de concorrentes ─────────────────────────────────────────

    async function handleAnalyze() {
        const validUrls = urls.filter(u => u.trim());
        if (!validUrls.length) return;

        setAnalyzing(true); setMsg(null); setResults([]); setConsolidated([]);

        try {
            const res  = await fetch('/api/admin/analyze-competitors', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ urls: validUrls }),
            });
            const data = await res.json();

            if (data.success) {
                setResults(data.results || []);
                setConsolidated(data.consolidated || []);
                setShowAnalysis(true);
                // Pré-seleciona headings que aparecem em 2+ URLs
                const autoSelected = new Set<string>(
                    (data.consolidated as ConsolidatedItem[])
                        .filter(c => c.frequency >= 2)
                        .map(c => `${c.level}:${c.text}`),
                );
                setSelected(autoSelected);
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } catch {
            setMsg({ text: '❌ Erro ao conectar à API. Tente novamente.', type: 'err' });
        } finally {
            setAnalyzing(false);
        }
    }

    function toggleSelect(item: ConsolidatedItem) {
        const key = `${item.level}:${item.text}`;
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function importSelected() {
        const toAdd = consolidated
            .filter(c => selected.has(`${c.level}:${c.text}`))
            .map(c => ({ level: c.level, text: c.text }));
        setOutline(prev => {
            const existing = new Set(prev.map(o => `${o.level}:${o.text}`));
            return [...prev, ...toAdd.filter(i => !existing.has(`${i.level}:${i.text}`))];
        });
        setShowAnalysis(false);
        setMsg({ text: `✅ ${toAdd.length} seção(ões) importada(s) para a outline!`, type: 'ok' });
    }

    // ── Editor de outline ─────────────────────────────────────────────

    function addItem() {
        setOutline(prev => [...prev, { level: 'h2', text: '' }]);
    }

    function removeItem(idx: number) {
        setOutline(prev => prev.filter((_, i) => i !== idx));
    }

    function updateItem(idx: number, field: keyof OutlineItem, value: string) {
        setOutline(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    }

    function moveItem(idx: number, dir: -1 | 1) {
        const next = idx + dir;
        if (next < 0 || next >= outline.length) return;
        setOutline(prev => {
            const arr = [...prev];
            [arr[idx], arr[next]] = [arr[next], arr[idx]];
            return arr;
        });
    }

    async function handleSave() {
        setSaving(true); setMsg(null);
        try {
            const cleanOutline = outline.filter(o => o.text.trim());
            const res  = await fetch(`/api/admin/services/${serviceSlug}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ outline: cleanOutline }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ text: '✅ Outline salva com sucesso!', type: 'ok' });
                onSaved?.(cleanOutline);
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setSaving(false);
        }
    }

    const validOutline = outline.filter(o => o.text.trim());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Seção: Extrair de concorrentes ─────────────────────── */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '0.75rem' }}>
                    🔍 Extrair Outline de Concorrentes
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-subtle)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Pesquise sua keyword no Google, cole as URLs dos top resultados e o sistema extrai os headings de cada página.
                    Headings frequentes (em 2+ concorrentes) são marcados automaticamente.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {urls.map((url, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                className="admin-input"
                                value={url}
                                onChange={e => setUrls(prev => prev.map((u, i) => i === idx ? e.target.value : u))}
                                placeholder={`https://concorrente${idx + 1}.com.br/servico`}
                                style={{ flex: 1, fontSize: '0.85rem' }}
                            />
                            {urls.length > 1 && (
                                <button onClick={() => setUrls(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 0.4rem', opacity: 0.7 }}>×</button>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {urls.length < 7 && (
                        <button onClick={() => setUrls(prev => [...prev, ''])} style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            + Adicionar URL
                        </button>
                    )}
                    <button
                        className="admin-btn admin-btn-primary"
                        onClick={handleAnalyze}
                        disabled={analyzing || !urls.some(u => u.trim())}
                        style={{ fontSize: '0.85rem', marginLeft: 'auto' }}
                    >
                        {analyzing ? '⏳ Analisando...' : '🔍 Analisar Concorrentes'}
                    </button>
                </div>
            </div>

            {/* ── Resultados da análise ────────────────────────────────── */}
            {showAnalysis && (
                <div className="admin-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
                            📊 Resultado da Análise
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {results.map(r => (
                                <span key={r.url} title={r.url} style={{ fontSize: '0.9rem' }}>{STATUS_ICON[r.status]}</span>
                            ))}
                        </div>
                    </div>

                    {/* Per-URL status */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {results.map(r => (
                            <div key={r.url} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '999px', background: r.status === 'success' || r.status === 'cached' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.08)', color: r.status === 'success' || r.status === 'cached' ? '#4ade80' : '#f87171', border: `1px solid ${r.status === 'success' || r.status === 'cached' ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                                {STATUS_ICON[r.status]} {hostname(r.url)} — {STATUS_LABEL[r.status]} ({r.headings.length} headings)
                            </div>
                        ))}
                    </div>

                    {/* Outline consolidada */}
                    {consolidated.length > 0 && (
                        <>
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', marginBottom: '0.75rem' }}>
                                Selecione os headings para importar. Marcados automaticamente: aparece em 2+ sites.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 320, overflowY: 'auto', marginBottom: '1rem' }}>
                                {consolidated.map(item => {
                                    const key      = `${item.level}:${item.text}`;
                                    const isChecked = selected.has(key);
                                    const indent    = { h1: 0, h2: 0, h3: 16, h4: 32 }[item.level];
                                    return (
                                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: indent, cursor: 'pointer', padding: `0.4rem 0.6rem 0.4rem ${indent + 8}px`, borderRadius: 6, background: isChecked ? 'rgba(99,102,241,0.07)' : 'transparent' }}>
                                            <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(item)} style={{ accentColor: 'var(--primary)', width: 14, height: 14, flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 4, background: `${LEVEL_COLORS[item.level]}22`, color: LEVEL_COLORS[item.level], flexShrink: 0 }}>
                                                {item.level.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text)', flex: 1 }}>{item.text}</span>
                                            <span style={{ fontSize: '0.72rem', color: item.frequency >= 2 ? '#4ade80' : 'var(--admin-text-subtle)', fontWeight: 700, flexShrink: 0 }}>
                                                {item.frequency}/{results.length}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={importSelected} className="admin-btn admin-btn-primary" disabled={selected.size === 0} style={{ fontSize: '0.85rem' }}>
                                    ↓ Importar {selected.size} selecionado(s)
                                </button>
                                <button onClick={() => setShowAnalysis(false)} className="admin-btn admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
                                    Fechar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Editor da outline ─────────────────────────────────────── */}
            <div className="admin-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
                            📋 Outline da Página
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', marginTop: '0.25rem' }}>
                            Use variáveis: <code style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.1em 0.3em', borderRadius: 3 }}>{'{servico}'}</code> <code style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.1em 0.3em', borderRadius: 3 }}>{'{cidade}'}</code> <code style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.1em 0.3em', borderRadius: 3 }}>{'{empresa}'}</code>
                        </p>
                    </div>
                    <button onClick={addItem} className="admin-btn admin-btn-secondary" style={{ fontSize: '0.8rem' }}>
                        + Seção
                    </button>
                </div>

                {outline.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)', borderRadius: 8, border: '1px dashed var(--admin-border)' }}>
                        <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Nenhuma seção adicionada.</p>
                        <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Extraia de concorrentes acima ou adicione manualmente.</p>
                        <button onClick={addItem} className="admin-btn admin-btn-primary" style={{ fontSize: '0.85rem' }}>+ Adicionar primeira seção</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {outline.map((item, idx) => {
                            const indent = { h1: 0, h2: 0, h3: 20, h4: 40 }[item.level];
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: indent }}>
                                    <select
                                        value={item.level}
                                        onChange={e => updateItem(idx, 'level', e.target.value as OutlineItem['level'])}
                                        style={{ background: `${LEVEL_COLORS[item.level]}22`, color: LEVEL_COLORS[item.level], border: `1px solid ${LEVEL_COLORS[item.level]}44`, borderRadius: 6, padding: '0.35rem 0.4rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, width: 52 }}
                                    >
                                        <option value="h1">H1</option>
                                        <option value="h2">H2</option>
                                        <option value="h3">H3</option>
                                        <option value="h4">H4</option>
                                    </select>
                                    <input
                                        className="admin-input"
                                        value={item.text}
                                        onChange={e => updateItem(idx, 'text', e.target.value)}
                                        placeholder="Título da seção (use {servico}, {cidade}...)"
                                        style={{ flex: 1, fontSize: '0.875rem' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                        <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}               style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-subtle)', fontSize: '0.65rem', padding: '0 0.25rem', lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                                        <button onClick={() => moveItem(idx,  1)} disabled={idx === outline.length-1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-subtle)', fontSize: '0.65rem', padding: '0 0.25rem', lineHeight: 1, opacity: idx === outline.length-1 ? 0.3 : 1 }}>▼</button>
                                    </div>
                                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '0 0.25rem', opacity: 0.6, flexShrink: 0 }}>×</button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Feedback + Salvar */}
            {msg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem' }}>
                    {msg.text}
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleSave}
                    disabled={saving || validOutline.length === 0}
                    style={{ fontSize: '0.9rem' }}
                >
                    {saving ? '⏳ Salvando...' : `💾 Salvar Outline (${validOutline.length} seções)`}
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-subtle)' }}>
                    {validOutline.length > 0
                        ? `Pronto para gerar conteúdo na aba ✍️ Conteúdo`
                        : 'Adicione seções à outline antes de salvar'}
                </span>
            </div>
        </div>
    );
}
