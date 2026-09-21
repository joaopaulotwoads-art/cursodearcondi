/**
 * KeywordsList.tsx
 *
 * Lista interativa de Keywords (Serviços) do Modo Local.
 * Exibe status de copy por keyword com geração inline e em lote.
 *
 * Status de cada keyword:
 *   ⚠️ Sem outline   — outline não definida (não é possível gerar)
 *   📋 Falta copy    — tem outline mas sem conteúdo gerado → botão ▶ Gerar inline
 *   ✅ Copy criada   — conteúdo gerado e salvo
 *
 * Funcionalidades:
 *   - Botão ▶ Gerar por linha (keywords com outline sem copy)
 *   - Barra de progresso inline durante geração
 *   - Toast no canto inferior direito ao concluir
 *   - Botão "Gerar todos pendentes" para gerar em lote
 *   - Deleção com confirmação
 */

import { useState, useCallback } from 'react';
import { useToast, ToastList } from './Toast';

interface OutlineItem { level: string; text: string; }

interface ServiceData {
    title:              string;
    slug:               string;
    icon?:              string;
    shortDescription?:  string;
    active?:            boolean;
    outline?:           OutlineItem[];
    generatedContent?:  string;
    contentGeneratedAt?: string;
    niche?:             string;
}

interface Props {
    initialServices: ServiceData[];
    onServicesUpdated?: (services: ServiceData[]) => void;
}

type CopyStatus = 'sem-outline' | 'falta-copy' | 'copy-ok';

function getStatus(svc: ServiceData): CopyStatus {
    if (svc.generatedContent) return 'copy-ok';
    if (svc.outline && svc.outline.length > 0) return 'falta-copy';
    return 'sem-outline';
}

const STATUS_BADGE: Record<CopyStatus, { label: string; bg: string; color: string; }> = {
    'sem-outline': { label: '⚠️ Sem outline',  bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    'falta-copy':  { label: '📋 Falta copy',   bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
    'copy-ok':     { label: '✅ Copy criada',  bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
};

export default function KeywordsList({ initialServices, onServicesUpdated }: Props) {
    const [services, setServices]           = useState<ServiceData[]>(initialServices);
    const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
    const [bulkRunning, setBulkRunning]     = useState(false);
    const [bulkTotal, setBulkTotal]         = useState(0);
    const [bulkDone, setBulkDone]           = useState(0);
    const [deletingSlug, setDeletingSlug]   = useState<string | null>(null);
    const [confirmSlug, setConfirmSlug]     = useState<string | null>(null);
    const { toasts, showToast, removeToast } = useToast();

    const pending = services.filter(s => getStatus(s) === 'falta-copy');

    // ── Geração individual ──────────────────────────────────────────────────

    const generateOne = useCallback(async (slug: string) => {
        setGeneratingSlug(slug);
        try {
            const svc = services.find(s => s.slug === slug);
            const res  = await fetch(`/api/admin/services/${slug}/generate-content`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    outline:    svc?.outline,
                    tone:       'profissional',
                    includeFaq: true,
                    save:       true,
                }),
            });
            const data = await res.json();

            if (data.success) {
                const next = services.map(s =>
                    s.slug === slug
                        ? { ...s, generatedContent: data.content, contentGeneratedAt: new Date().toISOString().split('T')[0] }
                        : s,
                );
                setServices(next);
                onServicesUpdated?.(next);
                showToast('success', 'Copy gerada!', svc?.title || slug);
            } else {
                showToast('error', 'Erro ao gerar copy', data.error || 'Tente novamente');
            }
        } catch {
            showToast('error', 'Erro de conexão', 'Verifique o servidor e tente novamente');
        } finally {
            setGeneratingSlug(null);
        }
    }, [services, showToast, onServicesUpdated]);

    // ── Geração em lote ─────────────────────────────────────────────────────

    const generateAll = useCallback(async () => {
        const queue = services.filter(s => getStatus(s) === 'falta-copy');
        if (!queue.length) return;

        setBulkRunning(true);
        setBulkTotal(queue.length);
        setBulkDone(0);

        for (const svc of queue) {
            setGeneratingSlug(svc.slug);
            try {
                const res  = await fetch(`/api/admin/services/${svc.slug}/generate-content`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        outline:    svc.outline,
                        tone:       'profissional',
                        includeFaq: true,
                        save:       true,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    const next = services.map(s =>
                        s.slug === svc.slug
                            ? { ...s, generatedContent: data.content, contentGeneratedAt: new Date().toISOString().split('T')[0] }
                            : s,
                    );
                    setServices(next);
                    onServicesUpdated?.(next);
                }
            } catch { /* continua para a próxima */ }
            setBulkDone(d => d + 1);
            setGeneratingSlug(null);
        }

        setBulkRunning(false);
        showToast('success', `${queue.length} copies geradas!`, 'Todas as keywords estão prontas');
    }, [services, showToast, onServicesUpdated]);

    // ── Deleção ─────────────────────────────────────────────────────────────

    const deleteService = useCallback(async (slug: string) => {
        setDeletingSlug(slug);
        try {
            const res  = await fetch(`/api/admin/services/${slug}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                const next = services.filter(s => s.slug !== slug);
                setServices(next);
                onServicesUpdated?.(next);
                showToast('success', 'Keyword removida');
            } else {
                showToast('error', 'Erro ao remover', data.error);
            }
        } catch {
            showToast('error', 'Erro de conexão');
        } finally {
            setDeletingSlug(null);
            setConfirmSlug(null);
        }
    }, [services, showToast, onServicesUpdated]);

    // ── Render ───────────────────────────────────────────────────────────────

    const copyOk    = services.filter(s => getStatus(s) === 'copy-ok').length;
    const semOutline = services.filter(s => getStatus(s) === 'sem-outline').length;

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', marginBottom: '0.25rem' }}>
                        Keywords
                    </h1>
                    <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.9rem' }}>
                        {services.length} keywords · {copyOk} com copy · {pending.length} pendentes
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {pending.length > 0 && !bulkRunning && (
                        <button
                            onClick={generateAll}
                            className="admin-btn admin-btn-secondary"
                            style={{ fontSize: '0.875rem' }}
                        >
                            ✨ Gerar todos pendentes ({pending.length})
                        </button>
                    )}
                    {bulkRunning && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                            <span style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 600 }}>
                                ⏳ Gerando {bulkDone}/{bulkTotal}...
                            </span>
                            <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <div style={{ width: `${(bulkDone / bulkTotal) * 100}%`, height: '100%', background: '#6366f1', borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                        </div>
                    )}
                    <a href="/admin/services/new" className="admin-btn admin-btn-primary" style={{ fontSize: '0.875rem' }}>
                        + Nova Keyword
                    </a>
                </div>
            </div>

            {/* Barra de progresso geral */}
            {services.length > 0 && (
                <div className="admin-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)' }}>
                            Copy gerada
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text)', fontWeight: 700 }}>
                            {copyOk}/{services.length}
                        </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                            width:      `${services.length ? (copyOk / services.length) * 100 : 0}%`,
                            height:     '100%',
                            background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                            borderRadius: 4,
                            transition: 'width 0.4s ease',
                        }} />
                    </div>
                    {semOutline > 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem' }}>
                            ⚠️ {semOutline} keyword(s) sem outline — abra o editor e defina a estrutura antes de gerar a copy.
                        </p>
                    )}
                </div>
            )}

            {/* Lista */}
            {services.length === 0 ? (
                <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔑</div>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhuma keyword cadastrada.</p>
                    <a href="/admin/services/new" className="admin-btn admin-btn-primary" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                        + Criar primeira keyword
                    </a>
                </div>
            ) : (
                <div className="admin-card" style={{ overflow: 'hidden', padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                {['Keyword', 'Slug', 'Copy', 'Ações'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'Ações' ? 'right' : 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {services.map(svc => {
                                const status     = getStatus(svc);
                                const badge      = STATUS_BADGE[status];
                                const isGenerating = generatingSlug === svc.slug;

                                return (
                                    <tr key={svc.slug} style={{ borderBottom: '1px solid var(--admin-border)', background: isGenerating ? 'rgba(99,102,241,0.04)' : 'transparent', transition: 'background 0.15s' }}>

                                        {/* Keyword */}
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                {svc.icon && <span style={{ fontSize: '1.25rem' }}>{svc.icon}</span>}
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--admin-text)', fontSize: '0.9rem' }}>{svc.title}</div>
                                                    {svc.shortDescription && (
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', marginTop: '0.15rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {svc.shortDescription}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Slug */}
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <code style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                                                /{svc.slug}/…
                                            </code>
                                        </td>

                                        {/* Status + Geração inline */}
                                        <td style={{ padding: '0.875rem 1rem', minWidth: 200 }}>
                                            {isGenerating ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <div style={{ width: 110, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                                        <div style={{ width: '60%', height: '100%', background: '#6366f1', borderRadius: 3, animation: 'pulse 1s ease-in-out infinite' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: '#818cf8' }}>Gerando...</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: 999, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                                                        {badge.label}
                                                    </span>
                                                    {svc.contentGeneratedAt && (
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-subtle)' }}>
                                                            {svc.contentGeneratedAt}
                                                        </span>
                                                    )}
                                                    {(status === 'falta-copy' || status === 'copy-ok') && !bulkRunning && (
                                                        <button
                                                            onClick={() => generateOne(svc.slug)}
                                                            disabled={!!generatingSlug}
                                                            title={status === 'copy-ok' ? 'Regenerar copy (mantém a outline)' : 'Gerar copy'}
                                                            style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, background: status === 'copy-ok' ? 'rgba(148,163,184,0.15)' : 'rgba(99,102,241,0.2)', color: status === 'copy-ok' ? 'var(--admin-text-subtle)' : '#818cf8', border: `1px solid ${status === 'copy-ok' ? 'rgba(148,163,184,0.3)' : 'rgba(99,102,241,0.3)'}`, cursor: 'pointer', whiteSpace: 'nowrap', opacity: generatingSlug ? 0.5 : 1 }}
                                                        >
                                                            {status === 'copy-ok' ? '🔄 Regenerar' : '▶ Gerar'}
                                                        </button>
                                                    )}
                                                    {status === 'sem-outline' && (
                                                        <a
                                                            href={`/admin/services/${svc.slug}?tab=outline`}
                                                            style={{ fontSize: '0.68rem', color: '#fbbf24', textDecoration: 'none', whiteSpace: 'nowrap' }}
                                                        >
                                                            Definir estrutura →
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Ações */}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
                                                <a
                                                    href={`/admin/services/${svc.slug}`}
                                                    className="admin-btn admin-btn-secondary"
                                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                                >
                                                    Editar
                                                </a>
                                                {confirmSlug === svc.slug ? (
                                                    <>
                                                        <button
                                                            onClick={() => deleteService(svc.slug)}
                                                            disabled={deletingSlug === svc.slug}
                                                            style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            {deletingSlug === svc.slug ? '...' : 'Confirmar'}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmSlug(null)}
                                                            style={{ fontSize: '0.72rem', background: 'none', border: 'none', color: 'var(--admin-text-subtle)', cursor: 'pointer' }}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmSlug(svc.slug)}
                                                        style={{ fontSize: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, padding: '0.2rem 0.3rem' }}
                                                        title="Excluir"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Dica */}
            {semOutline > 0 && (
                <div className="admin-card" style={{ padding: '1rem', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                    <p style={{ fontSize: '0.85rem', color: '#fbbf24', margin: 0 }}>
                        💡 <strong style={{ color: 'var(--admin-text)' }}>Para gerar copy</strong>, a keyword precisa ter uma outline definida.
                        Clique em <strong>Editar</strong> → aba <strong>🔍 Outline</strong> → monte a estrutura → salve.
                    </p>
                </div>
            )}
        </div>

        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
