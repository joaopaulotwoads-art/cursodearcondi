/**
 * LocationPagesManager.tsx
 *
 * Componente React do Gerador de Páginas Locais (Modo Local / Rank and Rent).
 * Permite criar e gerenciar páginas SEO para combinações de serviço + cidade/bairro.
 *
 * 3 abas:
 *   1. Localidades  — lista + adicionar individual + importar em massa (uma por linha)
 *   2. Template     — edita o template com variáveis ({cidade}, {servico}, etc.)
 *   3. Páginas      — visualiza todas as combinações URL geradas (serviço × cidade)
 *
 * URLs geradas: /[cidade-slug]/[servico-slug]
 * Variáveis disponíveis: {cidade}, {estado}, {servico}, {empresa}, {telefone}
 */

import { useState, useEffect, useCallback } from 'react';

interface LocationData {
    name: string;
    slug: string;
    state: string;
    active: boolean;
    filename?: string;
}

interface ServiceData {
    title: string;
    slug: string;
    icon?: string;
    active?: boolean;
}

interface TemplateData {
    heroTitle?: string;
    heroSubtitle?: string;
    pageContent?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
}

interface Props {
    services: ServiceData[];
}

const VARS_HELP = [
    { var: '{cidade}',   desc: 'Nome da cidade (ex: São Paulo)' },
    { var: '{estado}',   desc: 'Sigla do estado (ex: SP)' },
    { var: '{servico}',  desc: 'Nome do serviço (ex: Encanador)' },
    { var: '{empresa}',  desc: 'Nome da empresa (configurado na Home Local)' },
    { var: '{telefone}', desc: 'Telefone da empresa' },
];

export default function LocationPagesManager({ services }: Props) {
    const [tab, setTab] = useState<'locations' | 'template' | 'pages'>('locations');

    // ── Estado: Localidades ──────────────────────────────────────────
    const [locations, setLocations]   = useState<LocationData[]>([]);
    const [loadingLoc, setLoadingLoc] = useState(true);
    const [newName, setNewName]       = useState('');
    const [newState, setNewState]     = useState('');
    const [addingOne, setAddingOne]   = useState(false);
    const [bulkText, setBulkText]     = useState('');
    const [bulkMode, setBulkMode]     = useState(false);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [locMsg, setLocMsg]         = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
    const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

    // ── Estado: Template ─────────────────────────────────────────────
    const [template, setTemplate]       = useState<TemplateData>({});
    const [loadingTpl, setLoadingTpl]   = useState(true);
    const [savingTpl, setSavingTpl]     = useState(false);
    const [tplMsg, setTplMsg]           = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

    // ── Carrega dados ────────────────────────────────────────────────
    const fetchLocations = useCallback(async () => {
        setLoadingLoc(true);
        try {
            const res  = await fetch('/api/admin/locations');
            const data = await res.json();
            if (data.success) setLocations(data.locations || []);
        } finally {
            setLoadingLoc(false);
        }
    }, []);

    const fetchTemplate = useCallback(async () => {
        setLoadingTpl(true);
        try {
            const res  = await fetch('/api/admin/location-template');
            const data = await res.json();
            if (data.success) setTemplate(data.template || {});
        } finally {
            setLoadingTpl(false);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
        fetchTemplate();
    }, [fetchLocations, fetchTemplate]);

    // ── Ações: Localidades ───────────────────────────────────────────

    function slugify(name: string) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }

    async function handleAddOne(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim() || !newState.trim()) return;
        setAddingOne(true);
        setLocMsg(null);
        try {
            const res  = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), state: newState.trim().toUpperCase() }),
            });
            const data = await res.json();
            if (data.success) {
                setLocMsg({ text: '✅ Localidade adicionada!', type: 'ok' });
                setNewName('');
                setNewState('');
                await fetchLocations();
            } else {
                setLocMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setAddingOne(false);
        }
    }

    async function handleBulkImport() {
        const lines = bulkText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return;

        // Formato: "Nome da Cidade, UF" ou apenas "Nome da Cidade" (sem estado assume SP)
        const parsed = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name:  parts[0],
                state: parts[1]?.toUpperCase() || 'SP',
                slug:  slugify(parts[0]),
            };
        });

        setBulkImporting(true);
        setLocMsg(null);
        try {
            const res  = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: parsed }),
            });
            const data = await res.json();
            if (data.success) {
                const created  = (data.results || []).filter((r: any) => r.success).length;
                const skipped  = (data.results || []).filter((r: any) => !r.success).length;
                setLocMsg({
                    text: `✅ ${created} criada(s)${skipped > 0 ? ` · ${skipped} ignorada(s) (já existem)` : ''}`,
                    type: 'ok',
                });
                setBulkText('');
                setBulkMode(false);
                await fetchLocations();
            } else {
                setLocMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setBulkImporting(false);
        }
    }

    async function handleDelete(slug: string) {
        if (!confirm(`Remover a localidade "${slug}"?`)) return;
        setDeletingSlug(slug);
        try {
            await fetch(`/api/admin/locations/${slug}`, { method: 'DELETE' });
            await fetchLocations();
        } finally {
            setDeletingSlug(null);
        }
    }

    async function toggleActive(loc: LocationData) {
        await fetch(`/api/admin/locations/${loc.slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !loc.active }),
        });
        await fetchLocations();
    }

    // ── Ações: Template ───────────────────────────────────────────────

    function setBenefit(idx: number, val: string) {
        const arr = [...(template.benefits || [])];
        arr[idx] = val;
        setTemplate(t => ({ ...t, benefits: arr }));
    }

    function addBenefit() {
        setTemplate(t => ({ ...t, benefits: [...(t.benefits || []), ''] }));
    }

    function removeBenefit(idx: number) {
        const arr = [...(template.benefits || [])].filter((_, i) => i !== idx);
        setTemplate(t => ({ ...t, benefits: arr }));
    }

    async function saveTemplate(e: React.FormEvent) {
        e.preventDefault();
        setSavingTpl(true);
        setTplMsg(null);
        try {
            const res  = await fetch('/api/admin/location-template', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template),
            });
            const data = await res.json();
            if (data.success) {
                setTplMsg({ text: '✅ Template salvo com sucesso!', type: 'ok' });
            } else {
                setTplMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setSavingTpl(false);
        }
    }

    // ── Contagem de páginas geradas ───────────────────────────────────
    const activeLocations = locations.filter(l => l.active);
    const activeServices  = services.filter(s => s.active !== false);
    const totalPages      = activeLocations.length * activeServices.length;

    // ── UI ────────────────────────────────────────────────────────────
    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '0.6rem 1.25rem',
        fontWeight: 600,
        fontSize: '0.875rem',
        borderRadius: '8px 8px 0 0',
        border: 'none',
        cursor: 'pointer',
        background: active ? 'var(--admin-surface)' : 'transparent',
        color: active ? 'var(--admin-text)' : 'var(--admin-text-subtle)',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        transition: 'all 0.15s',
    });

    return (
        <div style={{ maxWidth: 900 }}>

            {/* ── Header ───────────────────────────────────────────── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', marginBottom: '0.25rem' }}>
                    Gerador de Páginas Locais
                </h1>
                <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.9rem' }}>
                    Crie páginas SEO para cada combinação de serviço + cidade. URL: /<em>cidade</em>/<em>serviço</em>
                </p>
            </div>

            {/* ── Stats cards ──────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Localidades ativas', value: activeLocations.length, icon: '📍' },
                    { label: 'Serviços ativos',     value: activeServices.length,  icon: '🔧' },
                    { label: 'Páginas geradas',     value: totalPages,             icon: '📄' },
                ].map(card => (
                    <div key={card.label} className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{card.icon}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit, sans-serif' }}>
                            {card.value}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', marginTop: '0.1rem' }}>
                            {card.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabs ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1.5rem' }}>
                <button style={tabStyle(tab === 'locations')} onClick={() => setTab('locations')}>
                    📍 Localidades ({locations.length})
                </button>
                <button style={tabStyle(tab === 'template')} onClick={() => setTab('template')}>
                    📝 Template
                </button>
                <button style={tabStyle(tab === 'pages')} onClick={() => setTab('pages')}>
                    🔗 Páginas ({totalPages})
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════
                ABA 1: LOCALIDADES
            ══════════════════════════════════════════════════════════ */}
            {tab === 'locations' && (
                <div>
                    {/* Mensagem de feedback */}
                    {locMsg && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            background: locMsg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${locMsg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            color: locMsg.type === 'ok' ? '#4ade80' : '#f87171',
                            fontSize: '0.875rem',
                        }}>
                            {locMsg.text}
                        </div>
                    )}

                    {/* Botões de ação */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <button
                            className="admin-btn admin-btn-primary"
                            onClick={() => { setBulkMode(false); setLocMsg(null); }}
                            style={{ fontSize: '0.875rem', opacity: !bulkMode ? 1 : 0.6 }}
                        >
                            ➕ Adicionar uma cidade
                        </button>
                        <button
                            className="admin-btn admin-btn-secondary"
                            onClick={() => { setBulkMode(true); setLocMsg(null); }}
                            style={{ fontSize: '0.875rem', opacity: bulkMode ? 1 : 0.6 }}
                        >
                            📋 Importar em massa
                        </button>
                    </div>

                    {/* Formulário: adicionar uma */}
                    {!bulkMode && (
                        <form onSubmit={handleAddOne} className="admin-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '0.75rem', alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)', marginBottom: '0.35rem' }}>
                                        Nome da cidade / bairro
                                    </label>
                                    <input
                                        className="admin-input"
                                        placeholder="Ex: São Paulo"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)', marginBottom: '0.35rem' }}>
                                        Estado (UF)
                                    </label>
                                    <input
                                        className="admin-input"
                                        placeholder="SP"
                                        maxLength={2}
                                        value={newState}
                                        onChange={e => setNewState(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="admin-btn admin-btn-primary"
                                    disabled={addingOne}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    {addingOne ? 'Adicionando...' : 'Adicionar'}
                                </button>
                            </div>
                            {newName && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', marginTop: '0.5rem' }}>
                                    URL gerada: /<strong>{slugify(newName)}</strong>/[serviço]
                                </p>
                            )}
                        </form>
                    )}

                    {/* Formulário: importar em massa */}
                    {bulkMode && (
                        <div className="admin-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', marginBottom: '0.75rem' }}>
                                Uma cidade por linha. Formato: <code style={{ background: 'var(--admin-bg)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>Nome, UF</code>. Se não informar o estado, usa <strong>SP</strong>.
                            </p>
                            <textarea
                                className="admin-input"
                                rows={8}
                                placeholder={"São Paulo, SP\nGuarulhos, SP\nOsasco, SP\nSanto André, SP\nSão Bernardo do Campo, SP"}
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '0.875rem', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                <button
                                    className="admin-btn admin-btn-primary"
                                    onClick={handleBulkImport}
                                    disabled={bulkImporting || !bulkText.trim()}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    {bulkImporting
                                        ? 'Importando...'
                                        : `Importar ${bulkText.split('\n').filter(l => l.trim()).length} cidade(s)`
                                    }
                                </button>
                                <button
                                    className="admin-btn admin-btn-secondary"
                                    onClick={() => { setBulkMode(false); setBulkText(''); }}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tabela de localidades */}
                    {loadingLoc ? (
                        <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.875rem' }}>Carregando...</p>
                    ) : locations.length === 0 ? (
                        <div className="admin-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
                            <p>Nenhuma localidade cadastrada ainda.</p>
                        </div>
                    ) : (
                        <div className="admin-card" style={{ overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        {['Cidade / Bairro', 'Estado', 'Slug (URL)', 'Status', 'Ações'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map(loc => (
                                        <tr key={loc.slug} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--admin-text)', fontWeight: 600, fontSize: '0.875rem' }}>
                                                {loc.name}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--admin-text-subtle)', fontSize: '0.875rem' }}>
                                                {loc.state}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--admin-text-subtle)' }}>
                                                /{loc.slug}/…
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <button
                                                    onClick={() => toggleActive(loc)}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '999px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        background: loc.active ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.15)',
                                                        color: loc.active ? '#4ade80' : '#94a3b8',
                                                    }}
                                                >
                                                    {loc.active ? 'Ativa' : 'Inativa'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <a
                                                        href={`/${loc.slug}/${activeServices[0]?.slug || ''}`}
                                                        target="_blank"
                                                        style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                                                    >
                                                        👁️ Ver
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(loc.slug)}
                                                        disabled={deletingSlug === loc.slug}
                                                        style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}
                                                    >
                                                        {deletingSlug === loc.slug ? '...' : '🗑️'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                ABA 2: TEMPLATE
            ══════════════════════════════════════════════════════════ */}
            {tab === 'template' && (
                <div>
                    {/* Referência de variáveis */}
                    <div className="admin-card" style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'rgba(37,99,235,0.3)' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.75rem' }}>
                            💡 Variáveis disponíveis — use nos campos abaixo:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {VARS_HELP.map(v => (
                                <div key={v.var} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <code style={{ background: 'rgba(37,99,235,0.2)', color: '#93c5fd', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
                                        {v.var}
                                    </code>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)' }}>{v.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {loadingTpl ? (
                        <p style={{ color: 'var(--admin-text-subtle)' }}>Carregando template...</p>
                    ) : (
                        <form onSubmit={saveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Hero */}
                            <div className="admin-card" style={{ padding: '1.25rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>
                                    🎯 Hero da Página
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Título principal</label>
                                        <input
                                            className="admin-input"
                                            value={template.heroTitle || ''}
                                            onChange={e => setTemplate(t => ({ ...t, heroTitle: e.target.value }))}
                                            placeholder="{servico} em {cidade} - {estado}"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Subtítulo</label>
                                        <textarea
                                            className="admin-input"
                                            rows={2}
                                            value={template.heroSubtitle || ''}
                                            onChange={e => setTemplate(t => ({ ...t, heroSubtitle: e.target.value }))}
                                            placeholder="Serviços profissionais de {servico} em {cidade} e região..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo */}
                            <div className="admin-card" style={{ padding: '1.25rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>
                                    📄 Conteúdo da Página
                                </h3>
                                <div>
                                    <label style={labelStyle}>Texto principal</label>
                                    <textarea
                                        className="admin-input"
                                        rows={5}
                                        value={template.pageContent || ''}
                                        onChange={e => setTemplate(t => ({ ...t, pageContent: e.target.value }))}
                                        placeholder="Se você procura {servico} em {cidade}..."
                                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {/* Benefícios */}
                            <div className="admin-card" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)' }}>
                                        ✅ Benefícios / Diferenciais
                                    </h3>
                                    <button type="button" className="admin-btn admin-btn-secondary" onClick={addBenefit} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                                        + Adicionar
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {(template.benefits || []).map((b, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                className="admin-input"
                                                value={b}
                                                onChange={e => setBenefit(idx, e.target.value)}
                                                placeholder="Atendimento rápido em {cidade}"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBenefit(idx)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem', padding: '0.25rem' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {(template.benefits || []).length === 0 && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)' }}>Nenhum benefício adicionado.</p>
                                    )}
                                </div>
                            </div>

                            {/* SEO */}
                            <div className="admin-card" style={{ padding: '1.25rem' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '1rem' }}>
                                    🔍 SEO
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Meta title <span style={{ color: '#94a3b8' }}>(máx. 60 caracteres recomendado)</span></label>
                                        <input
                                            className="admin-input"
                                            value={template.metaTitle || ''}
                                            onChange={e => setTemplate(t => ({ ...t, metaTitle: e.target.value }))}
                                            placeholder="{servico} em {cidade} | {empresa}"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Meta description <span style={{ color: '#94a3b8' }}>(máx. 160 caracteres recomendado)</span></label>
                                        <textarea
                                            className="admin-input"
                                            rows={2}
                                            value={template.metaDescription || ''}
                                            onChange={e => setTemplate(t => ({ ...t, metaDescription: e.target.value }))}
                                            placeholder="Precisa de {servico} em {cidade}? Ligue agora! Orçamento grátis."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Salvar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button type="submit" className="admin-btn admin-btn-primary" disabled={savingTpl}>
                                    {savingTpl ? 'Salvando...' : '💾 Salvar Template'}
                                </button>
                                {tplMsg && (
                                    <span style={{ fontSize: '0.875rem', color: tplMsg.type === 'ok' ? '#4ade80' : '#f87171' }}>
                                        {tplMsg.text}
                                    </span>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                ABA 3: PÁGINAS GERADAS
            ══════════════════════════════════════════════════════════ */}
            {tab === 'pages' && (
                <div>
                    {totalPages === 0 ? (
                        <div className="admin-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                            <p style={{ fontWeight: 600 }}>Nenhuma página gerada ainda.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Cadastre localidades e serviços para ver as páginas disponíveis.</p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-subtle)', marginBottom: '1rem' }}>
                                {totalPages} páginas disponíveis — {activeLocations.length} cidade(s) × {activeServices.length} serviço(s)
                            </p>

                            {/* Grade por serviço */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {activeServices.map(svc => (
                                    <div key={svc.slug} className="admin-card" style={{ padding: '1.25rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {svc.icon && <span>{svc.icon}</span>}
                                            {svc.title}
                                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--admin-text-subtle)' }}>
                                                ({activeLocations.length} páginas)
                                            </span>
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {activeLocations.map(loc => (
                                                <a
                                                    key={loc.slug}
                                                    href={`/${loc.slug}/${svc.slug}`}
                                                    target="_blank"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        background: 'var(--admin-bg)',
                                                        border: '1px solid var(--admin-border)',
                                                        color: 'var(--admin-text)',
                                                        textDecoration: 'none',
                                                        fontWeight: 500,
                                                        transition: 'all 0.15s',
                                                    }}
                                                    className="hover:border-blue-500"
                                                >
                                                    📍 {loc.name}
                                                    <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>↗</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--admin-text-subtle)',
    marginBottom: '0.35rem',
};
