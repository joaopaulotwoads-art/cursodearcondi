/**
 * PageMasterList.tsx — Master List de Páginas (modelo mercado SEO programático)
 *
 * Padrão de mercado: cada linha = uma página (bairro × serviço).
 * Fluxo: 1) Gerar copy com IA (outline → conteúdo) | 2) Publicar páginas (ativar bairros)
 *
 * Features:
 *   - Seção Copy: serviços com outline sem generatedContent → botão Gerar com IA
 *   - Filtros: status, bairro, serviço, busca
 *   - Bulk select por bairro (ativar bairro = cria páginas para todos os serviços)
 */

import { useState, useMemo } from 'react';

interface OutlineItem { level: string; text: string; }
interface ServiceData  { title: string; slug: string; icon?: string; active?: boolean; outline?: OutlineItem[]; generatedContent?: string; }
interface LocationData { name: string; slug: string; state: string; city?: string; active: boolean; type?: string; }

export interface PageRow {
    url: string;
    keyword: string;
    service: ServiceData;
    location: LocationData;
    status: 'publicada' | 'pendente';
}

type CopyStatus = 'ok' | 'falta' | 'sem-outline';

interface Props {
    services:  ServiceData[];
    locations: LocationData[];
    onLocationsUpdated(locations: LocationData[]): void;
    onServicesUpdated?(services: ServiceData[]): void;
}

type StatusFilter = 'todos' | 'pendentes' | 'publicadas';

export default function PageMasterList({ services, locations, onLocationsUpdated, onServicesUpdated }: Props) {
    const [search,        setSearch]        = useState('');
    const [statusFilter, setStatusFilter]  = useState<StatusFilter>('todos');
    const [filterBairro, setFilterBairro]  = useState<string>('');
    const [filterServico, setFilterServico] = useState<string>('');
    const [selectedBairros, setSelectedBairros] = useState<Set<string>>(new Set());
    const [generating,    setGenerating]   = useState(false);
    const [generatingCopy, setGeneratingCopy] = useState(false);
    const [generatingOneCopy, setGeneratingOneCopy] = useState<string | null>(null);
    const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0 });
    const [popoverService, setPopoverService] = useState<{ service: ServiceData; copyStatus: CopyStatus } | null>(null);

    const bairros       = locations.filter(l => l.type !== 'cidade');
    const activeServices = services.filter(s => s.active !== false);

    function getCopyStatus(s: ServiceData): CopyStatus {
        if (s.generatedContent?.trim()) return 'ok';
        const hasOutline = s.outline && s.outline.length > 0 && s.outline.some(o => o.text?.trim());
        return hasOutline ? 'falta' : 'sem-outline';
    }

    const servicesFaltaCopy = useMemo(() =>
        activeServices.filter(s => getCopyStatus(s) === 'falta'),
        [activeServices],
    );
    const servicesSemOutline = useMemo(() =>
        activeServices.filter(s => getCopyStatus(s) === 'sem-outline'),
        [activeServices],
    );

    // Master list: todas as combinações bairro × serviço
    const allRows = useMemo<PageRow[]>(() => {
        const rows: PageRow[] = [];
        bairros.forEach(loc => {
            activeServices.forEach(svc => {
                const url = `/${loc.slug}/${svc.slug}`;
                const keyword = `${svc.title} em ${loc.name}`;
                const status: 'publicada' | 'pendente' = loc.active ? 'publicada' : 'pendente';
                rows.push({ url, keyword, service: svc, location: loc, status });
            });
        });
        return rows;
    }, [bairros, activeServices]);

    const filteredRows = useMemo(() => {
        return allRows.filter(row => {
            if (statusFilter === 'pendentes' && row.status !== 'pendente') return false;
            if (statusFilter === 'publicadas' && row.status !== 'publicada') return false;
            if (filterBairro && row.location.slug !== filterBairro) return false;
            if (filterServico && row.service.slug !== filterServico) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!row.keyword.toLowerCase().includes(q) &&
                    !row.url.toLowerCase().includes(q) &&
                    !row.location.name.toLowerCase().includes(q) &&
                    !row.service.title.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [allRows, statusFilter, filterBairro, filterServico, search]);

    const pendentesByBairro = useMemo(() => {
        const map = new Map<string, LocationData>();
        allRows.filter(r => r.status === 'pendente').forEach(r => {
            if (!map.has(r.location.slug)) map.set(r.location.slug, r.location);
        });
        return map;
    }, [allRows]);

    const selectedCount = selectedBairros.size;
    const selectedPagesCount = selectedCount * activeServices.length;

    function toggleBairro(slug: string) {
        setSelectedBairros(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    }

    function selectAllPendentes() {
        setSelectedBairros(new Set(pendentesByBairro.keys()));
    }

    function clearSelection() {
        setSelectedBairros(new Set());
    }

    function isBairroSelected(slug: string) {
        return selectedBairros.has(slug);
    }

    function hasPendentes(slug: string) {
        return pendentesByBairro.has(slug);
    }

    async function handleGerar() {
        if (selectedBairros.size === 0) return;
        const toActivate = Array.from(selectedBairros).map(slug => bairros.find(b => b.slug === slug)).filter(Boolean) as LocationData[];
        setGenerating(true);
        try {
            await Promise.all(toActivate.map(loc =>
                fetch(`/api/admin/locations/${loc.slug}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: true }),
                }),
            ));
            const fresh = await fetch('/api/admin/locations').then(r => r.json());
            if (fresh.success) onLocationsUpdated(fresh.locations);
            setSelectedBairros(new Set());
        } finally {
            setGenerating(false);
        }
    }

    async function handleGerarCopy() {
        if (servicesFaltaCopy.length === 0) return;
        setGeneratingCopy(true);
        setCopyProgress({ current: 0, total: servicesFaltaCopy.length });
        try {
            for (let i = 0; i < servicesFaltaCopy.length; i++) {
                setCopyProgress({ current: i + 1, total: servicesFaltaCopy.length });
                const svc = servicesFaltaCopy[i];
                const res = await fetch(`/api/admin/services/${svc.slug}/generate-content`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        outline:    svc.outline,
                        tone:       'profissional',
                        extras:     '',
                        includeFaq: true,
                        save:       true,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    console.error('\x1b[31m✗ Erro ao gerar copy para', svc.slug, ':\x1b[0m', err);
                }
            }
            const fresh = await fetch('/api/admin/services').then(r => r.json());
            if (fresh.success && onServicesUpdated) onServicesUpdated(fresh.services);
        } finally {
            setGeneratingCopy(false);
            setCopyProgress({ current: 0, total: 0 });
        }
    }

    async function handleGerarCopyOne(svc: ServiceData) {
        if (getCopyStatus(svc) !== 'falta') return;
        setGeneratingOneCopy(svc.slug);
        try {
            const res = await fetch(`/api/admin/services/${svc.slug}/generate-content`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    outline:    svc.outline,
                    tone:       'profissional',
                    extras:     '',
                    includeFaq: true,
                    save:       true,
                }),
            });
            if (res.ok) {
                const fresh = await fetch('/api/admin/services').then(r => r.json());
                if (fresh.success && onServicesUpdated) onServicesUpdated(fresh.services);
                setPopoverService(null);
            }
        } finally {
            setGeneratingOneCopy(null);
        }
    }

    const publishedCount = allRows.filter(r => r.status === 'publicada').length;
    const pendingCount = allRows.filter(r => r.status === 'pendente').length;

    if (activeServices.length === 0 || bairros.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {activeServices.length === 0 ? 'Cadastre serviços' : 'Cadastre bairros'} para começar.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                    {activeServices.length === 0 && <a href="/admin/gerar-paginas?tab=keywords" className="admin-btn admin-btn-primary">+ Keywords</a>}
                    {bairros.length === 0 && <a href="/admin/gerar-paginas?tab=bairros" className="admin-btn admin-btn-primary">+ Bairros</a>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* ── Gerar copy de todas as páginas (quando necessário) ──────────── */}
            {(servicesFaltaCopy.length > 0 || servicesSemOutline.length > 0) && (
                <div
                    className="admin-card"
                    style={{
                        padding: '1rem 1.25rem',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '0.25rem' }}>
                                ✨ Gerar copy de todas as páginas
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-subtle)' }}>
                                {servicesFaltaCopy.length > 0 ? (
                                    <>
                                        {servicesFaltaCopy.length} serviço{servicesFaltaCopy.length !== 1 ? 's' : ''} pronto{servicesFaltaCopy.length !== 1 ? 's' : ''} para gerar conteúdo com IA.
                                        Clique abaixo para criar a copy de uma vez.
                                    </>
                                ) : null}
                                {servicesSemOutline.length > 0 && (
                                    <span style={{ display: 'block', marginTop: servicesFaltaCopy.length > 0 ? '0.35rem' : 0 }}>
                                        ⚠️ {servicesSemOutline.length} sem outline — defina no editor antes (clique em &quot;Pendente&quot; na tabela).
                                    </span>
                                )}
                            </p>
                        </div>
                        {servicesFaltaCopy.length > 0 && (
                            <button
                                onClick={handleGerarCopy}
                                disabled={generatingCopy}
                                className="admin-btn admin-btn-primary"
                                style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
                            >
                                {generatingCopy
                                    ? `⏳ Gerando ${copyProgress.current}/${copyProgress.total}...`
                                    : `✨ Gerar copy de todas as páginas (${servicesFaltaCopy.length} serviço${servicesFaltaCopy.length !== 1 ? 's' : ''})`}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Cards de resumo ───────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                {[
                    { icon: '📄', value: allRows.length, label: 'Total de combinações' },
                    { icon: '✅', value: publishedCount, label: 'Publicadas' },
                    { icon: '⏳', value: pendingCount, label: 'Pendentes' },
                    { icon: '✍️', value: activeServices.filter(s => getCopyStatus(s) === 'ok').length, label: 'Com copy' },
                    { icon: '🔑', value: activeServices.length, label: 'Serviços ativos' },
                ].map(c => (
                    <div key={c.label} className="admin-card" style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>{c.icon}</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit,sans-serif' }}>{c.value}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Toolbar: filtros + busca + bulk actions ───────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                    className="admin-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', minWidth: 140 }}
                >
                    <option value="todos">Todos</option>
                    <option value="pendentes">⏳ Pendentes</option>
                    <option value="publicadas">✅ Publicadas</option>
                </select>

                <select
                    value={filterBairro}
                    onChange={e => setFilterBairro(e.target.value)}
                    className="admin-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', minWidth: 160 }}
                >
                    <option value="">Todos os bairros</option>
                    {bairros.map(l => (
                        <option key={l.slug} value={l.slug}>{l.name}</option>
                    ))}
                </select>

                <select
                    value={filterServico}
                    onChange={e => setFilterServico(e.target.value)}
                    className="admin-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', minWidth: 160 }}
                >
                    <option value="">Todos os serviços</option>
                    {activeServices.map(s => (
                        <option key={s.slug} value={s.slug}>{s.title}</option>
                    ))}
                </select>

                <input
                    className="admin-input"
                    placeholder="Buscar por keyword, URL..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ fontSize: '0.85rem', flex: 1, minWidth: 200, maxWidth: 280 }}
                />

                {pendingCount > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <button
                            onClick={selectAllPendentes}
                            className="admin-btn admin-btn-secondary"
                            style={{ fontSize: '0.8rem' }}
                        >
                            Selecionar pendentes
                        </button>
                        {selectedCount > 0 && (
                            <>
                                <button onClick={clearSelection} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem' }}>
                                    Limpar
                                </button>
                                <button
                                    onClick={handleGerar}
                                    disabled={generating}
                                    className="admin-btn admin-btn-primary"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    {generating ? '⏳ Gerando...' : `🚀 Gerar ${selectedPagesCount} página${selectedPagesCount !== 1 ? 's' : ''} (${selectedCount} bairro${selectedCount !== 1 ? 's' : ''})`}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Barra de seleção ativa ───────────────────────────────────── */}
            {selectedCount > 0 && (
                <div
                    className="admin-card"
                    style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}
                >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                        {selectedCount} bairro{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''} → {selectedPagesCount} página{selectedPagesCount !== 1 ? 's' : ''} serão criada{selectedPagesCount !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={clearSelection} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem' }}>Cancelar</button>
                        <button
                            onClick={handleGerar}
                            disabled={generating}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: '0.85rem' }}
                        >
                            {generating ? '⏳ Gerando...' : 'Confirmar geração'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tabela Master List ───────────────────────────────────────── */}
            <div style={{ borderRadius: 10, border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--admin-surface)' }}>
                            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                <th style={{ padding: '0.6rem 0.75rem', width: 44, textAlign: 'center' }}>
                                    {pendingCount > 0 ? (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)' }}>Gerar</span>
                                    ) : null}
                                </th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase' }}>Bairro</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase' }}>Serviço</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase' }}>URL</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase' }}>Keyword</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', width: 90 }}>Conteúdo</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', width: 100 }}>Status</th>
                                <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map(row => (
                                <tr
                                    key={row.url}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: row.status === 'pendente' ? 'rgba(148,163,184,0.03)' : 'transparent',
                                    }}
                                >
                                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                        {row.status === 'pendente' && (
                                            <input
                                                type="checkbox"
                                                checked={isBairroSelected(row.location.slug)}
                                                onChange={() => toggleBairro(row.location.slug)}
                                                style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                            />
                                        )}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--admin-text)' }}>
                                        📍 {row.location.name}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {row.service.icon && <span>{row.service.icon}</span>}
                                            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text)' }}>{row.service.title}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <a href={row.url} target="_blank" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'monospace' }}>
                                            {row.url}
                                        </a>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', color: 'var(--admin-text-subtle)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.keyword}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                        {getCopyStatus(row.service) === 'ok' ? (
                                            <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>✓ Copy</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setPopoverService({ service: row.service, copyStatus: getCopyStatus(row.service) })}
                                                style={{
                                                    fontSize: '0.72rem',
                                                    color: '#fbbf24',
                                                    fontWeight: 600,
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    padding: 0,
                                                }}
                                            >
                                                Pendente
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                        <span
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: 6,
                                                background: row.status === 'publicada' ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.15)',
                                                color: row.status === 'publicada' ? '#4ade80' : 'var(--admin-text-subtle)',
                                            }}
                                        >
                                            {row.status === 'publicada' ? 'Publicada' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                                        {row.status === 'publicada' && (
                                            <a href={row.url} target="_blank" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                                Abrir ↗
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface)', fontSize: '0.78rem', color: 'var(--admin-text-subtle)' }}>
                    {filteredRows.length} de {allRows.length} combinações
                    {(statusFilter !== 'todos' || filterBairro || filterServico || search) && ' (filtrado)'}
                </div>
            </div>

            {/* ── Modal: Pendência (falta outline ou copy) ───────────────────── */}
            {popoverService && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                    }}
                    onClick={() => !generatingOneCopy && setPopoverService(null)}
                >
                    <div
                        className="admin-card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: 420,
                            padding: '1.5rem',
                            background: 'var(--admin-surface)',
                            border: '1px solid var(--admin-border)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            {popoverService.service.icon && <span style={{ fontSize: '1.25rem' }}>{popoverService.service.icon}</span>}
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>
                                {popoverService.service.title}
                            </h3>
                        </div>

                        {popoverService.copyStatus === 'sem-outline' ? (
                            <>
                                <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-subtle)', marginBottom: '1rem', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'var(--admin-text)' }}>Falta outline.</strong> A outline define a estrutura (H1, H2, H3) do conteúdo. 
                                    Sem ela, a IA não consegue gerar o texto.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <a
                                        href={`/admin/services/${popoverService.service.slug}?tab=outline`}
                                        className="admin-btn admin-btn-primary"
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        Definir outline
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setPopoverService(null)}
                                        className="admin-btn admin-btn-ghost"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-subtle)', marginBottom: '1rem', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'var(--admin-text)' }}>Falta copy.</strong> Este serviço tem outline mas ainda não tem o conteúdo gerado pela IA. 
                                    A copy será usada em todas as páginas deste serviço.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleGerarCopyOne(popoverService.service)}
                                        disabled={!!generatingOneCopy}
                                        className="admin-btn admin-btn-primary"
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        {generatingOneCopy === popoverService.service.slug ? '⏳ Gerando...' : '✨ Gerar copy com IA'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPopoverService(null)}
                                        disabled={!!generatingOneCopy}
                                        className="admin-btn admin-btn-ghost"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
