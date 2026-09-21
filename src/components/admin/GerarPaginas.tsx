/**
 * GerarPaginas.tsx — Page Generator (central rank and rent)
 *
 * Hub unificado para SEO programático. Reúne Keywords, Bairros, Master List e Template
 * em uma única interface com abas para fluxo mais simples e usável.
 *
 * Abas:
 *   • Keywords — cadastro e geração de copy das keywords (serviços)
 *   • Bairros   — cidades e bairros para cobertura geográfica
 *   • Páginas  — Master List com visão de combinações bairro × serviço
 *   • Template — textos padrão para páginas sem conteúdo gerado por IA
 */

import { useState, useEffect, useCallback } from 'react';
import KeywordsList from './KeywordsList';
import BairrosManager from './BairrosManager';
import PageMasterList from './PageMasterList';
import LocationTemplateEditor from './LocationTemplateEditor';

interface ServiceData  { title: string; slug: string; icon?: string; active?: boolean; generatedContent?: string; outline?: any[]; }
interface LocationData { name: string; slug: string; state: string; city?: string; active: boolean; type?: string; }

type Tab = 'keywords' | 'bairros' | 'paginas' | 'template';

const TAB_VALID = ['keywords', 'bairros', 'paginas', 'template'] as const;

function getInitialTab(): Tab {
    if (typeof window === 'undefined') return 'keywords';
    const p = new URLSearchParams(window.location.search).get('tab');
    return TAB_VALID.includes(p as Tab) ? (p as Tab) : 'keywords';
}

function updateUrlTab(tab: Tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
}

export default function GerarPaginas() {
    const [tab, setTab] = useState<Tab>(getInitialTab);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const [svcData, locData] = await Promise.all([
            fetch('/api/admin/services').then(r => r.json()),
            fetch('/api/admin/locations').then(r => r.json()),
        ]);
        const svcs = svcData.success ? (svcData.services || []).filter((s: ServiceData) => s.active !== false) : [];
        setServices(svcs);
        if (locData.success) setLocations(locData.locations || []);
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
    }, [fetchData]);

    // Atualiza dados ao voltar para aba Páginas (para refletir mudanças feitas em Keywords/Bairros)
    useEffect(() => {
        if (tab === 'paginas' && !loading) {
            fetchData();
        }
    }, [tab, loading, fetchData]);

    const handleSetTab = (t: Tab) => {
        setTab(t);
        updateUrlTab(t);
    };

    const bairros = locations.filter((l: LocationData) => l.type !== 'cidade');
    const totalCombinations = services.length * bairros.length;

    const tabStyle = (t: Tab) => ({
        padding: '0.65rem 1.25rem',
        fontWeight: 700,
        fontSize: '0.9rem',
        border: 'none',
        cursor: 'pointer',
        background: tab === t ? 'var(--admin-surface)' : 'transparent',
        color: tab === t ? 'var(--admin-text)' : 'var(--admin-text-subtle)',
        borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
        transition: 'all 0.15s',
    });

    if (loading && (tab === 'paginas' || tab === 'template')) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                Carregando...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960 }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', marginBottom: '0.25rem' }}>
                    🚀 Page Generator
                </h1>
                <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.95rem' }}>
                    Keywords, bairros e páginas SEO em um só lugar.
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                <button onClick={() => handleSetTab('keywords')} style={tabStyle('keywords')}>
                    🔑 Keywords ({services.length})
                </button>
                <button onClick={() => handleSetTab('bairros')} style={tabStyle('bairros')}>
                    📍 Bairros ({locations.length})
                </button>
                <button onClick={() => handleSetTab('paginas')} style={tabStyle('paginas')}>
                    📄 Páginas ({totalCombinations})
                </button>
                <button onClick={() => handleSetTab('template')} style={tabStyle('template')}>
                    📝 Template
                </button>
            </div>

            {/* ═══ ABA KEYWORDS ═══ */}
            {tab === 'keywords' && (
                <div style={{ marginTop: '0.5rem' }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>Carregando keywords...</div>
                    ) : (
                        <KeywordsList
                            initialServices={services}
                            onServicesUpdated={setServices}
                        />
                    )}
                </div>
            )}

            {/* ═══ ABA BAIRROS ═══ */}
            {tab === 'bairros' && (
                <div style={{ marginTop: '0.5rem' }}>
                    <BairrosManager onLocationsUpdated={setLocations} />
                </div>
            )}

            {/* ═══ ABA PÁGINAS (Master List) ═══ */}
            {tab === 'paginas' && (
                <PageMasterList
                    services={services}
                    locations={locations}
                    onLocationsUpdated={setLocations}
                    onServicesUpdated={setServices}
                />
            )}

            {/* ═══ ABA TEMPLATE ═══ */}
            {tab === 'template' && (
                <div style={{ marginTop: '0.5rem' }}>
                    <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Textos e SEO usados nas páginas /bairro/servico quando não há conteúdo gerado por IA. Use variáveis: {'{servico}'}, {'{cidade}'}, {'{bairro}'}, {'{empresa}'}...
                    </p>
                    <LocationTemplateEditor />
                </div>
            )}
        </div>
    );
}
