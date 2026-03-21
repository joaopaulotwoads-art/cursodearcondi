/**
 * NichosManager.tsx
 *
 * Gerenciador de Nichos do Modo Local (rank and rent).
 * Um Nicho é o agrupador pai das keywords (serviços SEO).
 *
 * Duas visões:
 *   1. Lista de Nichos — cards com stats e barra de força
 *   2. Detalhe do Nicho — serviços vinculados + Matriz de Dominação (serviços × bairros)
 *
 * A Matriz de Dominação mostra:
 *   🟢 Verde  = página ativa (serviço + bairro existem e estão ativos)
 *   🔴 Vermelho = oportunidade não capturada (clicável → vai para Gerar Páginas)
 */

import { useState, useEffect, useCallback } from 'react';

interface NichoData {
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    color?: string;
    active: boolean;
    serviceCount: number;
    activeServices: number;
}

interface ServiceData {
    niche?: string;
    title: string;
    slug: string;
    icon?: string;
    active?: boolean;
}

interface LocationData {
    name: string;
    slug: string;
    state: string;
    city?: string;
    citySlug?: string;
    type?: string;
    active: boolean;
}

const ICON_OPTIONS = ['📦','🔧','⚡','🏠','🚗','💊','🛏️','🔍','🪟','🚿','🌿','🔒','🐛','🧹','🎨','📱','🌊','🔑','🎯','💡'];

function slugify(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Sub-componente: Matriz de Dominação ──────────────────────────────────────

function MatrizDominacao({ nicho, locations }: { nicho: NichoData; locations: LocationData[] }) {
    const [services, setServices] = useState<ServiceData[]>([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        fetch(`/api/admin/nichos/${nicho.slug}`)
            .then(r => r.json())
            .then(d => { if (d.success) setServices(d.services || []); })
            .finally(() => setLoading(false));
    }, [nicho.slug]);

    const activeServices  = services.filter(s => s.active !== false);
    const activeBairros   = locations.filter(l => l.active);
    const totalCells      = activeServices.length * activeBairros.length;
    const activeCells     = totalCells; // all exist since both are active
    const strength        = totalCells > 0 ? 100 : 0;

    if (loading) return <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.85rem', padding: '1rem' }}>Carregando matriz...</p>;

    if (activeServices.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
                <p style={{ fontWeight: 600 }}>Nenhum serviço neste nicho ainda.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>Crie serviços em <strong>Serviços</strong> e vincule ao nicho <strong>{nicho.name}</strong>.</p>
                <a href="/admin/services/new" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                    + Novo Serviço
                </a>
            </div>
        );
    }

    if (activeBairros.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
                <p style={{ fontWeight: 600 }}>Nenhum bairro cadastrado ainda.</p>
                <a href="/admin/gerar-paginas?tab=bairros" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                    + Cadastrar Bairros
                </a>
            </div>
        );
    }

    // Agrupar bairros por cidade
    const cities: Record<string, LocationData[]> = {};
    activeBairros.forEach(b => {
        const city = b.city || b.name;
        if (!cities[city]) cities[city] = [];
        cities[city].push(b);
    });

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', padding: '1rem 0', marginBottom: '1rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit,sans-serif' }}>{activeServices.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit,sans-serif' }}>{activeBairros.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bairros</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80', fontFamily: 'Outfit,sans-serif' }}>{totalCells}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Páginas</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--admin-text-subtle)' }}>Força do nicho</span>
                        <span style={{ fontWeight: 700, color: '#4ade80' }}>{strength}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--admin-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${strength}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)', borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                </div>
            </div>

            {/* Matriz */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--admin-text-subtle)', fontWeight: 600, borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--admin-card-bg,var(--admin-surface))' }}>
                                Keyword / Bairro
                            </th>
                            {activeBairros.map(b => (
                                <th key={b.slug} style={{ padding: '0.4rem 0.5rem', textAlign: 'center', color: 'var(--admin-text-subtle)', fontWeight: 600, borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap', minWidth: 80 }}>
                                    <div style={{ fontSize: '0.7rem' }}>{b.name}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{b.state}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {activeServices.map((svc, si) => (
                            <tr key={svc.slug} style={{ borderBottom: '1px solid var(--admin-border)', background: si % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--admin-text)', fontWeight: 500, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: si % 2 === 0 ? 'var(--admin-card-bg,var(--admin-surface))' : 'var(--admin-surface)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {svc.icon && <span>{svc.icon}</span>}
                                        <span style={{ fontSize: '0.78rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.title}</span>
                                    </div>
                                </td>
                                {activeBairros.map(b => (
                                    <td key={b.slug} style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                                        <a
                                            href={`/${b.slug}/${svc.slug}`}
                                            target="_blank"
                                            title={`/${b.slug}/${svc.slug}`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 28,
                                                height: 28,
                                                borderRadius: 6,
                                                background: 'rgba(74,222,128,0.12)',
                                                border: '1px solid rgba(74,222,128,0.3)',
                                                fontSize: '0.85rem',
                                                textDecoration: 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            ✅
                                        </a>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', marginTop: '1rem' }}>
                ✅ Página ativa — clique para abrir · Para adicionar mais bairros ou serviços, use <a href="/admin/gerar-paginas?tab=paginas" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>🚀 Page Generator</a>
            </p>
        </div>
    );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface Props {
    initialLocations: LocationData[];
}

export default function NichosManager({ initialLocations }: Props) {
    const [nichos, setNichos]             = useState<NichoData[]>([]);
    const [loading, setLoading]           = useState(true);
    const [selected, setSelected]         = useState<NichoData | null>(null);
    const [detailTab, setDetailTab]       = useState<'servicos' | 'matriz'>('servicos');
    const [detailServices, setDetailSvc]  = useState<ServiceData[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal novo nicho
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName]     = useState('');
    const [newIcon, setNewIcon]     = useState('📦');
    const [newDesc, setNewDesc]     = useState('');
    const [newColor, setNewColor]   = useState('#6366f1');
    const [saving, setSaving]       = useState(false);
    const [msg, setMsg]             = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
    const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

    const fetchNichos = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/admin/nichos');
            const data = await res.json();
            if (data.success) setNichos(data.nichos || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNichos(); }, [fetchNichos]);

    async function openDetail(nicho: NichoData) {
        setSelected(nicho);
        setDetailTab('servicos');
        setLoadingDetail(true);
        try {
            const res  = await fetch(`/api/admin/nichos/${nicho.slug}`);
            const data = await res.json();
            if (data.success) setDetailSvc(data.services || []);
        } finally {
            setLoadingDetail(false);
        }
    }

    async function saveNicho(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);
        setMsg(null);
        try {
            const res  = await fetch('/api/admin/nichos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), icon: newIcon, description: newDesc, color: newColor }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ text: '✅ Nicho criado!', type: 'ok' });
                setNewName(''); setNewIcon('📦'); setNewDesc(''); setNewColor('#6366f1');
                setShowModal(false);
                await fetchNichos();
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setSaving(false);
        }
    }

    async function deleteNicho(slug: string, name: string) {
        if (!confirm(`Remover o nicho "${name}"?\n\nOs serviços vinculados NÃO serão removidos.`)) return;
        setDeletingSlug(slug);
        try {
            await fetch(`/api/admin/nichos/${slug}`, { method: 'DELETE' });
            if (selected?.slug === slug) setSelected(null);
            await fetchNichos();
        } finally {
            setDeletingSlug(null);
        }
    }

    const totalPages   = nichos.reduce((acc, n) => acc + n.activeServices, 0) * initialLocations.filter(l => l.active).length;
    const activeBairros = initialLocations.filter(l => l.active).length;

    // ── Vista Detalhe ────────────────────────────────────────────────
    if (selected) {
        return (
            <div style={{ maxWidth: 1100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-subtle)', fontSize: '1.25rem', padding: '0.25rem' }}>←</button>
                    <div style={{ fontSize: '2rem' }}>{selected.icon || '📦'}</div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-text)', margin: 0 }}>{selected.name}</h1>
                        {selected.description && <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-subtle)', margin: 0 }}>{selected.description}</p>}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <a href={`/admin/services/new?niche=${selected.slug}`} className="admin-btn admin-btn-primary" style={{ fontSize: '0.85rem' }}>+ Novo Serviço</a>
                        <a href={`/admin/gerar-paginas?tab=paginas&niche=${selected.slug}`} className="admin-btn admin-btn-secondary" style={{ fontSize: '0.85rem' }}>🚀 Gerar Páginas</a>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1.5rem' }}>
                    {(['servicos', 'matriz'] as const).map(t => (
                        <button key={t} onClick={() => setDetailTab(t)} style={{
                            padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
                            border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0', background: 'transparent',
                            color: detailTab === t ? 'var(--admin-text)' : 'var(--admin-text-subtle)',
                            borderBottom: detailTab === t ? '2px solid var(--primary)' : '2px solid transparent',
                        }}>
                            {t === 'servicos' ? `🔑 Keywords (${detailServices.length})` : '🎯 Matriz de Cobertura'}
                        </button>
                    ))}
                </div>

                <div className="admin-card" style={{ padding: '1.25rem' }}>
                    {detailTab === 'servicos' && (
                        loadingDetail ? (
                            <p style={{ color: 'var(--admin-text-subtle)' }}>Carregando...</p>
                        ) : detailServices.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔑</div>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhuma keyword neste nicho ainda.</p>
                                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Crie serviços e vincule ao nicho <strong>{selected.name}</strong>.</p>
                                <a href={`/admin/services/new?niche=${selected.slug}`} style={{ display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
                                    + Criar primeira keyword
                                </a>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {detailServices.map(svc => (
                                    <div key={svc.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                                        <span style={{ fontSize: '1.25rem' }}>{svc.icon || '🔑'}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--admin-text)' }}>{svc.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', fontFamily: 'monospace' }}>/{svc.slug}</div>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: svc.active !== false ? 'rgba(74,222,128,0.12)' : 'rgba(148,163,184,0.12)', color: svc.active !== false ? '#4ade80' : '#94a3b8' }}>
                                            {svc.active !== false ? 'Ativo' : 'Inativo'}
                                        </span>
                                        <a href={`/admin/services/${svc.slug}`} style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Editar →</a>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {detailTab === 'matriz' && (
                        <MatrizDominacao nicho={selected} locations={initialLocations} />
                    )}
                </div>
            </div>
        );
    }

    // ── Vista Lista ──────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', margin: 0 }}>🎯 Nichos</h1>
                    <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Organize suas keywords por tema. Cada nicho agrupa as páginas que você quer ranquear.
                    </p>
                </div>
                <button onClick={() => { setShowModal(true); setMsg(null); }} className="admin-btn admin-btn-primary">
                    + Novo Nicho
                </button>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { icon: '🎯', value: nichos.length,  label: 'Nichos' },
                    { icon: '📍', value: activeBairros,  label: 'Bairros ativos' },
                    { icon: '📄', value: totalPages,     label: 'Páginas geradas' },
                ].map(c => (
                    <div key={c.label} className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{c.icon}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit,sans-serif' }}>{c.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Feedback */}
            {msg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem' }}>
                    {msg.text}
                </div>
            )}

            {/* Nichos grid */}
            {loading ? (
                <p style={{ color: 'var(--admin-text-subtle)' }}>Carregando...</p>
            ) : nichos.length === 0 ? (
                <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                    <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nenhum nicho cadastrado ainda.</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Crie seu primeiro nicho para começar a organizar suas keywords.</p>
                    <button onClick={() => setShowModal(true)} className="admin-btn admin-btn-primary">
                        + Criar primeiro nicho
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
                    {nichos.map(n => {
                        const pages    = n.activeServices * activeBairros;
                        const maxPages = n.serviceCount * activeBairros;
                        const strength = maxPages > 0 ? Math.round((pages / maxPages) * 100) : 0;
                        return (
                            <div key={n.slug} className="admin-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                                 onClick={() => openDetail(n)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ fontSize: '1.75rem', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${n.color || '#6366f1'}22`, flexShrink: 0 }}>
                                        {n.icon || '📦'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--admin-text)', fontSize: '0.95rem' }}>{n.name}</div>
                                        {n.description && <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.description}</div>}
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); deleteNicho(n.slug, n.name); }} disabled={deletingSlug === n.slug} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', opacity: 0.6, flexShrink: 0 }}>🗑️</button>
                                </div>

                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                                    <span style={{ color: 'var(--admin-text-subtle)' }}>🔑 <strong style={{ color: 'var(--admin-text)' }}>{n.serviceCount}</strong> keywords</span>
                                    <span style={{ color: 'var(--admin-text-subtle)' }}>📄 <strong style={{ color: 'var(--admin-text)' }}>{pages}</strong> páginas</span>
                                </div>

                                {/* Força */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--admin-text-subtle)', marginBottom: '0.25rem' }}>
                                        <span>Força do nicho</span>
                                        <span style={{ fontWeight: 700, color: strength >= 80 ? '#4ade80' : strength >= 40 ? '#fb923c' : '#f87171' }}>
                                            {pages > 0 ? `${strength}%` : 'Não iniciado'}
                                        </span>
                                    </div>
                                    <div style={{ height: 5, borderRadius: 999, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${strength}%`, background: strength >= 80 ? '#22c55e' : strength >= 40 ? '#f97316' : '#ef4444', borderRadius: 999, transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                    <button onClick={e => { e.stopPropagation(); openDetail(n); }} style={{ flex: 1, padding: '0.45rem', borderRadius: '7px', border: '1px solid var(--admin-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--admin-text)', fontWeight: 600 }}>
                                        Ver Detalhes →
                                    </button>
                                    <a href={`/admin/gerar-paginas?tab=paginas&niche=${n.slug}`} onClick={e => e.stopPropagation()} style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                                        🚀
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal novo nicho */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="admin-card" style={{ width: '100%', maxWidth: 480, padding: '1.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>🎯 Novo Nicho</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-subtle)', fontSize: '1.25rem' }}>×</button>
                        </div>

                        {msg && (
                            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '7px', marginBottom: '1rem', background: msg.type === 'err' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', color: msg.type === 'err' ? '#f87171' : '#4ade80', fontSize: '0.85rem' }}>
                                {msg.text}
                            </div>
                        )}

                        <form onSubmit={saveNicho} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={lbl}>Nome do nicho</label>
                                <input className="admin-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Cama Hospitalar" required autoFocus />
                                {newName && <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-subtle)', marginTop: '0.3rem' }}>Slug: <strong>{slugify(newName)}</strong></p>}
                            </div>

                            <div>
                                <label style={lbl}>Ícone</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {ICON_OPTIONS.map(ic => (
                                        <button type="button" key={ic} onClick={() => setNewIcon(ic)} style={{ width: 36, height: 36, fontSize: '1.25rem', borderRadius: 8, border: `2px solid ${newIcon === ic ? 'var(--primary)' : 'var(--admin-border)'}`, background: newIcon === ic ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer' }}>
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={lbl}>Descrição (opcional)</label>
                                <input className="admin-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Locação de camas para recuperação domiciliar" />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving} style={{ flex: 1 }}>
                                    {saving ? 'Criando...' : '✅ Criar Nicho'}
                                </button>
                                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)', marginBottom: '0.35rem' };
