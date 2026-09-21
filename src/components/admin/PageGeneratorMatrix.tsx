/**
 * PageGeneratorMatrix.tsx — Aba "Ver Páginas" do Gerador de Páginas
 *
 * Exibe páginas ativas (bairro × serviço) em 3 modos:
 *
 *   📋 Lista — tabela plana de todas as URLs (padrão)
 *   📍 Por Bairro — lista agrupada por bairro (expandível)
 *   🔲 Matriz — heatmap keywords × bairros
 *      Verde = bairro ativado (páginas existem)
 *      Cinza = bairro pendente (não ativado)
 *
 * Filtros: busca por bairro/serviço; toggle "mostrar pendentes" na matriz.
 */

import { useState, useMemo } from 'react';

interface ServiceData  { title: string; slug: string; icon?: string; active?: boolean; generatedContent?: string; }
interface LocationData { name: string; slug: string; state: string; city?: string; active: boolean; type?: string; }

interface Props {
    services:  ServiceData[];
    locations: LocationData[];
    onGoGenerate(): void;
}

type ViewMode = 'table' | 'bairro' | 'matrix';

/** Card de bairro expandível na visão "Por Bairro" */
function BairroCard({ loc, urls, defaultOpen }: { loc: LocationData; urls: { url: string; service: ServiceData }[]; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div style={{ border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden', marginBottom: '0.5rem' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--admin-surface)', border: 'none', cursor: 'pointer', textAlign: 'left',
                    color: 'var(--admin-text)', fontSize: '0.95rem', fontWeight: 600,
                }}
            >
                <span>📍 {loc.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', fontWeight: 500 }}>
                    {urls.length} página{urls.length !== 1 ? 's' : ''} · {open ? '▲' : '▼'}
                </span>
            </button>
            {open && (
                <div style={{ padding: '0.5rem 1rem 1rem', background: 'var(--admin-bg)', borderTop: '1px solid var(--admin-border)' }}>
                    {urls.map(({ url, service }) => (
                        <a key={url} href={url} target="_blank" style={{ display: 'block', padding: '0.4rem 0', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            {service.icon && <span style={{ marginRight: '0.35rem' }}>{service.icon}</span>}/{loc.slug}/{service.slug}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PageGeneratorMatrix({ services, locations, onGoGenerate }: Props) {
    const [view,          setView]          = useState<ViewMode>('table');
    const [search,        setSearch]        = useState('');
    const [showInactive,  setShowInactive]  = useState(false);

    // Só bairros (exclui cidades) — páginas são geradas por bairro × serviço
    const bairrosOnly     = locations.filter(l => l.type !== 'cidade');
    const activeServices  = services.filter(s => s.active !== false);
    const activeLocations = bairrosOnly.filter(l => l.active);
    const allLocations    = showInactive ? bairrosOnly : activeLocations;
    const totalPages      = activeServices.length * activeLocations.length;

    // Filtros por busca
    const filteredServices  = useMemo(() =>
        activeServices.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase())),
        [activeServices, search],
    );

    const filteredLocations = useMemo(() =>
        allLocations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.slug.includes(search.toLowerCase()) || (l.city || '').toLowerCase().includes(search.toLowerCase())),
        [allLocations, search],
    );

    // Todas as URLs ativas para a tabela
    const allUrls = useMemo(() => {
        const rows: { url: string; service: ServiceData; location: LocationData }[] = [];
        activeServices.forEach(svc => {
            activeLocations.forEach(loc => {
                if (
                    (!search || svc.title.toLowerCase().includes(search.toLowerCase()) || loc.name.toLowerCase().includes(search.toLowerCase()))
                ) {
                    rows.push({ url: `/${loc.slug}/${svc.slug}`, service: svc, location: loc });
                }
            });
        });
        return rows;
    }, [activeServices, activeLocations, search]);

    // Agrupado por bairro para a visão "Por Bairro"
    const urlsByBairro = useMemo(() => {
        const map = new Map<string, { loc: LocationData; urls: { url: string; service: ServiceData }[] }>();
        allUrls.forEach(({ url, service, location }) => {
            const key = location.slug;
            if (!map.has(key)) map.set(key, { loc: location, urls: [] });
            map.get(key)!.urls.push({ url, service });
        });
        return Array.from(map.values()).sort((a, b) => a.loc.name.localeCompare(b.loc.name));
    }, [allUrls]);

    // ── Estilos reutilizáveis ────────────────────────────────────────────────
    const btnToggle = (active: boolean): React.CSSProperties => ({
        padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700,
        borderRadius: 6, border: 'none', cursor: 'pointer',
        background: active ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : 'var(--admin-text-subtle)',
        transition: 'all 0.15s',
    });

    if (totalPages === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhuma página ativa ainda.</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Use a aba 🚀 Gerar para ativar suas primeiras páginas.</p>
                <button onClick={onGoGenerate} className="admin-btn admin-btn-primary">🚀 Gerar páginas</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

                {/* Toggle view — Lista | Por Bairro | Matriz */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: 8 }}>
                    <button style={btnToggle(view === 'table')}  onClick={() => setView('table')}>📋 Lista</button>
                    <button style={btnToggle(view === 'bairro')}  onClick={() => setView('bairro')}>📍 Por Bairro</button>
                    <button style={btnToggle(view === 'matrix')} onClick={() => setView('matrix')}>🔲 Matriz</button>
                </div>

                {/* Busca */}
                <input
                    className="admin-input"
                    placeholder="Buscar serviço ou bairro..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ fontSize: '0.85rem', flex: 1, minWidth: 200, maxWidth: 320 }}
                />

                {/* Toggle pendentes (só na matriz) */}
                {view === 'matrix' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--admin-text-subtle)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                        Mostrar bairros pendentes
                    </label>
                )}

                {/* Contagem */}
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', marginLeft: 'auto' }}>
                    {totalPages} páginas · {activeServices.length} serviços · {activeLocations.length} bairros ativados
                </span>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                VIEW: POR BAIRRO
            ══════════════════════════════════════════════════════════════ */}
            {view === 'bairro' && (
                <div>
                    {urlsByBairro.length === 0 ? (
                        <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.875rem', padding: '1rem 0' }}>
                            Nenhum resultado para "{search}".
                        </p>
                    ) : (
                        urlsByBairro.map(({ loc, urls }, i) => (
                            <BairroCard key={loc.slug} loc={loc} urls={urls} defaultOpen={i < 3} />
                        ))
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VIEW: MATRIZ
            ══════════════════════════════════════════════════════════════ */}
            {view === 'matrix' && (
                <div>
                    {filteredServices.length === 0 || filteredLocations.length === 0 ? (
                        <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.875rem', padding: '1rem 0' }}>
                            Nenhum resultado para "{search}".
                        </p>
                    ) : (
                        <>
                        {/* Legenda */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            {[
                                { bg: 'rgba(34,197,94,0.4)', label: 'Bairro ativado — clique para abrir a página' },
                                { bg: 'rgba(255,255,255,0.06)', label: 'Bairro pendente — use a aba Gerar para ativar' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--admin-text-subtle)' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, flexShrink: 0 }} />
                                    {l.label}
                                </div>
                            ))}
                        </div>

                        {/* Scroll wrapper */}
                        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--admin-border)' }}>
                            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                                <thead>
                                    <tr>
                                        {/* Célula de canto — sticky */}
                                        <th style={{
                                            position: 'sticky', left: 0, zIndex: 3,
                                            background: 'var(--admin-surface)',
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid var(--admin-border)',
                                            borderRight: '1px solid var(--admin-border)',
                                            minWidth: 200, textAlign: 'left',
                                            fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-subtle)',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            Keyword \ Bairro
                                        </th>
                                        {filteredLocations.map(loc => (
                                            <th key={loc.slug} style={{
                                                padding: '0.6rem 0.5rem',
                                                borderBottom: '1px solid var(--admin-border)',
                                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                                minWidth: 80,
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                                                    <span style={{
                                                        fontSize: '0.7rem', fontWeight: 700,
                                                        color: loc.active ? 'var(--admin-text)' : 'var(--admin-text-subtle)',
                                                        writingMode: 'vertical-rl',
                                                        transform: 'rotate(180deg)',
                                                        maxHeight: 90, overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {loc.name}
                                                    </span>
                                                    {!loc.active && (
                                                        <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>pendente</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        {/* Coluna de total */}
                                        <th style={{
                                            padding: '0.6rem 0.75rem',
                                            borderBottom: '1px solid var(--admin-border)',
                                            borderLeft: '1px solid var(--admin-border)',
                                            fontSize: '0.65rem', fontWeight: 700,
                                            color: 'var(--admin-text-subtle)', textAlign: 'center',
                                            textTransform: 'uppercase', minWidth: 60,
                                        }}>
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredServices.map((svc, si) => {
                                        const activeCells = filteredLocations.filter(l => l.active).length;
                                        return (
                                            <tr key={svc.slug} style={{ background: si % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                                {/* Keyword — coluna sticky */}
                                                <td style={{
                                                    position: 'sticky', left: 0, zIndex: 2,
                                                    background: si % 2 === 0 ? 'var(--admin-bg)' : 'var(--admin-surface)',
                                                    padding: '0.6rem 1rem',
                                                    borderRight: '1px solid var(--admin-border)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {svc.icon && <span style={{ fontSize: '1rem', flexShrink: 0 }}>{svc.icon}</span>}
                                                        <div>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {svc.title}
                                                            </div>
                                                            {!svc.generatedContent && (
                                                                <div style={{ fontSize: '0.62rem', color: '#fbbf24', marginTop: '0.1rem' }}>sem copy</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Células da matriz */}
                                                {filteredLocations.map(loc => {
                                                    const isActive = loc.active && svc.active !== false;
                                                    const url      = `/${loc.slug}/${svc.slug}`;
                                                    return (
                                                        <td key={loc.slug} style={{
                                                            padding: '0.35rem 0.4rem',
                                                            textAlign: 'center',
                                                            borderRight: '1px solid rgba(255,255,255,0.03)',
                                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                        }}>
                                                            {isActive ? (
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    title={`/${loc.slug}/${svc.slug}`}
                                                                    style={{
                                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                        width: 28, height: 28, borderRadius: 6,
                                                                        background: 'rgba(34,197,94,0.2)',
                                                                        border: '1px solid rgba(34,197,94,0.35)',
                                                                        textDecoration: 'none', fontSize: '0.65rem',
                                                                        transition: 'all 0.12s',
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.45)';
                                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)';
                                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                                                    }}
                                                                >
                                                                    <span style={{ color: '#4ade80', fontSize: '0.9rem', lineHeight: 1 }}>●</span>
                                                                </a>
                                                            ) : (
                                                                <div style={{
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    width: 28, height: 28, borderRadius: 6,
                                                                    background: 'transparent',
                                                                }}>
                                                                    <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: '0.9rem', lineHeight: 1 }}>○</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Total por keyword */}
                                                <td style={{
                                                    padding: '0.6rem 0.75rem', textAlign: 'center',
                                                    borderLeft: '1px solid var(--admin-border)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80' }}>{activeCells}</span>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-subtle)' }}>/{filteredLocations.length}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {/* Rodapé com total por coluna */}
                                <tfoot>
                                    <tr>
                                        <td style={{
                                            position: 'sticky', left: 0, zIndex: 2,
                                            background: 'var(--admin-surface)',
                                            padding: '0.5rem 1rem',
                                            borderTop: '1px solid var(--admin-border)',
                                            borderRight: '1px solid var(--admin-border)',
                                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            Total por bairro
                                        </td>
                                        {filteredLocations.map(loc => {
                                            const count = loc.active ? filteredServices.length : 0;
                                            return (
                                                <td key={loc.slug} style={{
                                                    padding: '0.5rem 0.4rem', textAlign: 'center',
                                                    borderTop: '1px solid var(--admin-border)',
                                                    borderRight: '1px solid rgba(255,255,255,0.03)',
                                                }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: loc.active ? '#4ade80' : 'rgba(255,255,255,0.15)' }}>
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td style={{
                                            padding: '0.5rem 0.75rem', textAlign: 'center',
                                            borderTop: '1px solid var(--admin-border)',
                                            borderLeft: '1px solid var(--admin-border)',
                                        }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                {totalPages}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        </>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VIEW: TABELA
            ══════════════════════════════════════════════════════════════ */}
            {view === 'table' && (
                <div>
                    {allUrls.length === 0 ? (
                        <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.875rem', padding: '1rem 0' }}>
                            Nenhum resultado para "{search}".
                        </p>
                    ) : (
                        <div style={{ borderRadius: 10, border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}>
                                        {['URL', 'Serviço', 'Bairro', 'Conteúdo', ''].map(h => (
                                            <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {h || 'Ação'}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUrls.map(({ url, service, location }) => (
                                        <tr key={url} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <a href={url} target="_blank" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                                                    {url}
                                                </a>
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {service.icon && <span style={{ fontSize: '0.9rem' }}>{service.icon}</span>}
                                                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text)', fontWeight: 500 }}>{service.title}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--admin-text)' }}>
                                                    📍 {location.name}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', marginLeft: '0.35rem' }}>
                                                    {location.state}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                {service.generatedContent ? (
                                                    <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>✓ Personalizado</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)' }}>Genérico</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                                                >
                                                    Abrir ↗
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface)', fontSize: '0.78rem', color: 'var(--admin-text-subtle)' }}>
                                {allUrls.length} URLs{search ? ` (filtrado de ${totalPages})` : ''}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
