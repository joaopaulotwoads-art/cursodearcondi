/**
 * BairrosManager.tsx
 *
 * Gerenciador de Cidades e Bairros do Modo Local (rank and rent).
 *
 * UX REFATORADA:
 *   - Um único painel de ações: cidade (seletor com opção "Nova cidade") + bairros (textarea)
 *   - Nova cidade: opção no seletor revela campos inline (sem modo separado)
 *   - Importar em massa: aba secundária no mesmo painel
 *   - Lista por cidade sempre visível abaixo
 *   - Ativação em lote de bairros inativos
 *
 * Props:
 *   onLocationsUpdated — callback opcional para sincronizar com parent (ex: Page Generator)
 */

import { useState, useEffect, useCallback } from 'react';

interface LocationData {
    name: string;
    slug: string;
    state: string;
    city?: string;
    citySlug?: string;
    type?: string;
    active: boolean;
    filename?: string;
}

function slugify(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const NEW_CITY_VALUE = '__nova_cidade__';

interface Props {
    onLocationsUpdated?: (locations: LocationData[]) => void;
}

export default function BairrosManager({ onLocationsUpdated }: Props) {
    const [locations, setLocations]   = useState<LocationData[]>([]);
    const [loading, setLoading]       = useState(true);
    const [msg, setMsg]               = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

    // Painel unificado: 'add' | 'bulk'
    const [panel, setPanel]           = useState<'add' | 'bulk'>('add');

    // Cidade selecionada (ou NEW_CITY_VALUE para nova)
    const [selectedCity, setSelectedCity] = useState('');
    const [bairroNames, setBairroNames]   = useState('');
    const [addingBairros, setAddingBairros] = useState(false);

    // Nova cidade (inline no seletor)
    const [newCityName, setNewCityName]   = useState('');
    const [newCityState, setNewCityState] = useState('SP');
    const [addingCity, setAddingCity]     = useState(false);

    // Bulk
    const [bulkCity, setBulkCity]     = useState('');
    const [bulkText, setBulkText]     = useState('');
    const [bulkState, setBulkState]   = useState('SP');
    const [importing, setImporting]   = useState(false);

    const [expandedCity, setExpandedCity] = useState<string | null>(null);
    const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
    const [deletingCity, setDeletingCity] = useState<string | null>(null);

    // Modal de confirmação
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        description: string;
        label: string;
        onConfirm: () => void;
    } | null>(null);
    const [selectedBairros, setSelectedBairros] = useState<Set<string>>(new Set());
    const [activatingBulk, setActivatingBulk] = useState(false);

    const fetchLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/admin/locations');
            const data = await res.json();
            if (data.success) {
                const locs = data.locations || [];
                setLocations(locs);
                onLocationsUpdated?.(locs);
            }
        } finally {
            setLoading(false);
        }
    }, [onLocationsUpdated]);

    useEffect(() => { fetchLocations(); }, [fetchLocations]);

    const grouped: Record<string, LocationData[]> = {};
    locations.forEach(loc => {
        const city = loc.city || loc.name;
        if (!grouped[city]) grouped[city] = [];
        grouped[city].push(loc);
    });
    const cityNames = Object.keys(grouped).sort();
    const cityOptions = cityNames.length ? cityNames : locations.filter(l => l.type === 'cidade').map(c => c.name);

    async function handleAddCity(e: React.FormEvent) {
        e.preventDefault();
        if (!newCityName.trim()) return;
        setAddingCity(true); setMsg(null);
        const name = newCityName.trim();
        const state = newCityState.toUpperCase();
        const slug = slugify(name);
        try {
            const res = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, slug, state,
                    city: name, citySlug: slug,
                    type: 'cidade', active: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ text: `✅ Cidade "${name}" cadastrada!`, type: 'ok' });
                setNewCityName('');
                setSelectedCity(name);
                setBulkCity(name);
                await fetchLocations();
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } finally {
            setAddingCity(false);
        }
    }

    async function handleAddBairros(e?: React.FormEvent) {
        e?.preventDefault();
        const isNew = panel === 'add' && selectedCity === NEW_CITY_VALUE;
        const city = (panel === 'add' ? (isNew ? newCityName.trim() : selectedCity.trim()) : (bulkCity === NEW_CITY_VALUE ? newCityName.trim() : bulkCity.trim()));
        if (!city || !bairroNames.trim()) return;

        const lines = bairroNames.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return;

        setAddingBairros(true); setMsg(null);

        try {
            // Se cidade nova, criar primeiro
            if (isNew && newCityName.trim()) {
                const resCity = await fetch('/api/admin/locations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: city, slug: slugify(city), state: newCityState.toUpperCase(),
                        city, citySlug: slugify(city), type: 'cidade', active: true,
                    }),
                });
                const dataCity = await resCity.json();
                if (!dataCity.success) {
                    setMsg({ text: `❌ ${dataCity.error}`, type: 'err' });
                    setAddingBairros(false);
                    return;
                }
                await fetchLocations();
            }

            const cityData = locations.find(l => (l.city || l.name) === city) || locations.find(l => l.name === city);
            const citySlug = cityData?.citySlug || slugify(city);
            const state   = cityData?.state || newCityState || 'SP';

            const parsed = lines.map(name => ({
                name, slug: slugify(name), state, city, citySlug, type: 'bairro' as const,
            }));
            const res = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: parsed }),
            });
            const data = await res.json();
            if (data.success) {
                const created = (data.results || []).filter((r: any) => r.success).length;
                const skipped = (data.results || []).filter((r: any) => !r.success).length;
                setMsg({ text: `✅ ${created} bairro(s) em ${city}${skipped > 0 ? ` · ${skipped} já existiam` : ''}`, type: 'ok' });
                setBairroNames('');
                if (isNew) { setSelectedCity(city); setNewCityName(''); }
                await fetchLocations();
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } catch {
            setMsg({ text: '❌ Erro ao adicionar bairros', type: 'err' });
        } finally {
            setAddingBairros(false);
        }
    }

    async function handleBulkImport() {
        const isNew = bulkCity === NEW_CITY_VALUE;
        const city = isNew ? newCityName.trim() : bulkCity.trim();
        const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        if (!lines.length || !city) return;

        setImporting(true); setMsg(null);

        try {
            if (isNew) {
                const resCity = await fetch('/api/admin/locations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: city, slug: slugify(city), state: bulkState.toUpperCase(),
                        city, citySlug: slugify(city), type: 'cidade', active: true,
                    }),
                });
                const dataCity = await resCity.json();
                if (!dataCity.success) {
                    setMsg({ text: `❌ ${dataCity.error}`, type: 'err' });
                    setImporting(false);
                    return;
                }
                await fetchLocations();
            }

            const cityData = locations.find(l => (l.city || l.name) === city) || locations.find(l => l.name === city);
            const citySlug = cityData?.citySlug || slugify(city);
            const state   = bulkState.toUpperCase();

            const parsed = lines.map(line => {
                const parts = line.split(',').map(p => p.trim());
                const name = parts[0];
                const c = parts[1] || city;
                const st = parts[2] || state;
                return { name, slug: slugify(name), state: st, city: c, citySlug: slugify(c), type: 'bairro' as const };
            });

            const res = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: parsed }),
            });
            const data = await res.json();
            if (data.success) {
                const created = (data.results || []).filter((r: any) => r.success).length;
                const skipped = (data.results || []).filter((r: any) => !r.success).length;
                setMsg({ text: `✅ ${created} bairro(s) importado(s)${skipped > 0 ? ` · ${skipped} já existiam` : ''}`, type: 'ok' });
                setBulkText('');
                if (isNew) { setBulkCity(city); setNewCityName(''); }
                await fetchLocations();
            } else {
                setMsg({ text: `❌ ${data.error}`, type: 'err' });
            }
        } catch {
            setMsg({ text: '❌ Erro ao importar', type: 'err' });
        } finally {
            setImporting(false);
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

    function confirmAction(opts: { title: string; description: string; label: string; onConfirm: () => void }) {
        setConfirmModal(opts);
    }

    async function handleDelete(slug: string, name: string) {
        confirmAction({
            title: 'Excluir bairro',
            description: `Tem certeza que deseja excluir o bairro "${name}"? Esta ação não pode ser desfeita.`,
            label: 'Excluir bairro',
            onConfirm: async () => {
                setConfirmModal(null);
                setDeletingSlug(slug);
                try {
                    await fetch(`/api/admin/locations/${slug}`, { method: 'DELETE' });
                    await fetchLocations();
                } finally {
                    setDeletingSlug(null);
                }
            },
        });
    }

    /** Exclui cidade e todos os seus bairros (em cascata). */
    function handleDeleteCity(cityName: string, items: LocationData[]) {
        const cidade = items.find(l => l.type === 'cidade');
        const bairros = items.filter(l => l.type !== 'cidade');
        confirmAction({
            title: `Excluir "${cityName}"`,
            description: bairros.length > 0
                ? `Esta ação irá excluir a cidade e ${bairros.length} bairro(s) cadastrado(s). Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja excluir a cidade "${cityName}"? Esta ação não pode ser desfeita.`,
            label: bairros.length > 0 ? `Excluir cidade e ${bairros.length} bairro(s)` : 'Excluir cidade',
            onConfirm: async () => {
                setConfirmModal(null);
                setDeletingCity(cityName);
                try {
                    for (const loc of bairros) {
                        await fetch(`/api/admin/locations/${loc.slug}`, { method: 'DELETE' });
                    }
                    if (cidade) {
                        await fetch(`/api/admin/locations/${cidade.slug}`, { method: 'DELETE' });
                    }
                    setMsg({ text: `✅ Cidade "${cityName}" e bairros removidos.`, type: 'ok' });
                    await fetchLocations();
                } catch {
                    setMsg({ text: '❌ Erro ao excluir. Tente novamente.', type: 'err' });
                } finally {
                    setDeletingCity(null);
                }
            },
        });
    }

    const inactiveBairros = locations.filter(l => l.type !== 'cidade' && !l.active);
    const selectedCount = selectedBairros.size;

    function toggleBairroSelection(slug: string) {
        setSelectedBairros(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    }

    function selectAllInactive() {
        setSelectedBairros(new Set(inactiveBairros.map(b => b.slug)));
    }

    function clearBairroSelection() {
        setSelectedBairros(new Set());
    }

    async function handleActivateBulk() {
        if (selectedBairros.size === 0) return;
        setActivatingBulk(true);
        try {
            await Promise.all(
                Array.from(selectedBairros).map(slug =>
                    fetch(`/api/admin/locations/${slug}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: true }),
                    }),
                ),
            );
            setSelectedBairros(new Set());
            await fetchLocations();
            setMsg({ text: `✅ ${selectedCount} bairro(s) ativado(s)!`, type: 'ok' });
        } catch {
            setMsg({ text: '❌ Erro ao ativar bairros', type: 'err' });
        } finally {
            setActivatingBulk(false);
        }
    }

    const cidades = locations.filter(l => l.type === 'cidade');
    const activeCount = locations.filter(l => l.active).length;
    const bairroCount = bairroNames.split('\n').filter(l => l.trim()).length;
    const bulkCount = bulkText.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;

    return (
        <div style={{ maxWidth: 920 }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text)', margin: 0 }}>📍 Cidades e Bairros</h1>
                <p style={{ color: 'var(--admin-text-subtle)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Cadastre cidades e bairros para gerar páginas locais (/{'{'}bairro{'}'}/{'{'}serviço{'}'}).
                    Para excluir uma cidade e seus bairros, clique no ícone 🗑️ ao lado do nome da cidade.
                </p>
            </div>

            {/* Barra de ativação em lote */}
            {inactiveBairros.length > 0 && (
                <div
                    className="admin-card"
                    style={{
                        padding: '0.85rem 1.25rem',
                        marginBottom: '1.5rem',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                    }}
                >
                    <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                            ⏳ {inactiveBairros.length} bairro(s) inativo(s)
                        </span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', marginTop: '0.2rem' }}>
                            Selecione e ative em lote para publicar as páginas
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={selectAllInactive} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem' }}>
                            Selecionar todos
                        </button>
                        {selectedCount > 0 && (
                            <>
                                <button onClick={clearBairroSelection} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem' }}>Limpar</button>
                                <button
                                    onClick={handleActivateBulk}
                                    disabled={activatingBulk}
                                    className="admin-btn admin-btn-primary"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    {activatingBulk ? '⏳ Ativando...' : `✅ Ativar ${selectedCount} selecionado(s)`}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                    { icon: '🏙️', value: cidades.length, label: 'Cidades' },
                    { icon: '📍', value: locations.length, label: 'Total' },
                    { icon: '✅', value: activeCount, label: 'Ativos' },
                ].map(c => (
                    <div key={c.label} className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{c.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-text)', fontFamily: 'Outfit,sans-serif' }}>{c.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {msg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.875rem' }}>
                    {msg.text}
                </div>
            )}

            {/* Painel unificado */}
            <div className="admin-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.75rem' }}>
                    <button
                        onClick={() => { setPanel('add'); setMsg(null); }}
                        style={{
                            padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: panel === 'add' ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: panel === 'add' ? 'var(--primary)' : 'var(--admin-text-subtle)',
                            borderBottom: panel === 'add' ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: -9,
                            borderRadius: 6,
                        }}
                    >
                        ➕ Adicionar bairros
                    </button>
                    <button
                        onClick={() => { setPanel('bulk'); setMsg(null); }}
                        style={{
                            padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: panel === 'bulk' ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: panel === 'bulk' ? 'var(--primary)' : 'var(--admin-text-subtle)',
                            borderBottom: panel === 'bulk' ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: -9,
                            borderRadius: 6,
                        }}
                    >
                        📋 Importar em massa
                    </button>
                </div>

                {/* Seletor de cidade (comum) + opção Nova cidade */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={lbl}>Cidade *</label>
                    <select
                        className="admin-input"
                        value={panel === 'add' ? selectedCity : bulkCity}
                        onChange={e => {
                            const v = e.target.value;
                            if (panel === 'add') setSelectedCity(v); else setBulkCity(v);
                            if (v !== NEW_CITY_VALUE) setMsg(null);
                        }}
                    >
                        <option value="">— Selecione a cidade —</option>
                        <option value={NEW_CITY_VALUE}>➕ Cadastrar nova cidade...</option>
                        {cityOptions.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    {/* Inline: Nova cidade */}
                    {(panel === 'add' ? selectedCity : bulkCity) === NEW_CITY_VALUE && (
                        <form onSubmit={handleAddCity} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '0.75rem', alignItems: 'end', marginTop: '0.75rem', padding: '1rem', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                            <div>
                                <label style={{ ...lbl, fontSize: '0.75rem' }}>Nome da cidade</label>
                                <input className="admin-input" placeholder="São Paulo" value={newCityName} onChange={e => setNewCityName(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ ...lbl, fontSize: '0.75rem' }}>UF</label>
                                <select className="admin-input" value={newCityState} onChange={e => setNewCityState(e.target.value)}>
                                    {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="admin-btn admin-btn-primary" disabled={addingCity || !newCityName.trim()} style={{ fontSize: '0.85rem' }}>
                                {addingCity ? 'Salvando...' : 'Cadastrar cidade'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Bulk: UF padrão */}
                {panel === 'bulk' && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={lbl}>UF padrão</label>
                        <select className="admin-input" value={bulkState} onChange={e => setBulkState(e.target.value)} style={{ maxWidth: 120 }}>
                            {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>
                )}

                {/* Textarea: bairros */}
                <div>
                    <label style={lbl}>
                        {panel === 'add' ? 'Bairros (um por linha)' : 'Lista (um por linha ou Bairro, Cidade, UF)'}
                    </label>
                    <textarea
                        className="admin-input"
                        rows={panel === 'add' ? 5 : 7}
                        placeholder={panel === 'add'
                            ? "Moema\nPinheiros\nVila Madalena\nBarra Funda"
                            : "Moema\nPinheiros\n\n# Ou: Bairro, Cidade, UF\nIpanema, Rio de Janeiro, RJ"}
                        value={panel === 'add' ? bairroNames : bulkText}
                        onChange={e => panel === 'add' ? setBairroNames(e.target.value) : setBulkText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '0.875rem', resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
                    {panel === 'add' ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); handleAddBairros(e as any); }}
                                className="admin-btn admin-btn-primary"
                                disabled={
                                    addingBairros ||
                                    ((selectedCity === NEW_CITY_VALUE ? !newCityName.trim() : !selectedCity.trim())) ||
                                    !bairroNames.trim()
                                }
                                style={{ fontSize: '0.85rem' }}
                            >
                                {addingBairros ? 'Adicionando...' : `Adicionar ${bairroCount} bairro(s)`}
                            </button>
                            {selectedCity !== NEW_CITY_VALUE && selectedCity && (
                                <button type="button" onClick={() => setBairroNames('')} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.85rem' }}>Limpar</button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={handleBulkImport}
                                disabled={
                                    importing ||
                                    ((bulkCity === NEW_CITY_VALUE ? !newCityName.trim() : !bulkCity.trim())) ||
                                    !bulkText.trim()
                                }
                                style={{ fontSize: '0.85rem' }}
                            >
                                {importing ? 'Importando...' : `Importar ${bulkCount} bairro(s)`}
                            </button>
                            <button className="admin-btn admin-btn-secondary" onClick={() => setBulkText('')} style={{ fontSize: '0.85rem' }}>Limpar</button>
                        </>
                    )}
                </div>
            </div>

            {/* Lista por cidade */}
            {loading ? (
                <p style={{ color: 'var(--admin-text-subtle)' }}>Carregando...</p>
            ) : locations.length === 0 ? (
                <div className="admin-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-subtle)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏙️</div>
                    <p style={{ fontWeight: 600 }}>Nenhuma cidade cadastrada.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>Selecione "Cadastrar nova cidade" acima e preencha os campos.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cityNames.map(city => {
                        const items = grouped[city];
                        const state = items[0]?.state || '';
                        const isExpanded = expandedCity === city;
                        const bairrosOnly = items.filter(loc => loc.type !== 'cidade');
                        const ativosCount = bairrosOnly.filter(b => b.active).length;

                        return (
                            <div key={city} className="admin-card" style={{ overflow: 'visible' }}>
                                <div
                                    style={{ padding: '0.85rem 1rem', borderBottom: isExpanded ? '1px solid var(--admin-border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', flexWrap: 'wrap' }}
                                    onClick={() => setExpandedCity(isExpanded ? null : city)}
                                >
                                    <span style={{ fontSize: '0.9rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>▶</span>
                                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏙️</span>
                                    <div style={{ flex: 1, minWidth: 100 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--admin-text)', fontSize: '0.95rem' }}>{city}</span>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-subtle)' }}>{state}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-subtle)', flexShrink: 0 }}>{ativosCount}/{bairrosOnly.length} bairros ativos</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCity(city, items); }}
                                            disabled={deletingCity === city}
                                            title={`Excluir ${city} e todos os bairros`}
                                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', fontWeight: 600, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', borderRadius: '6px', cursor: deletingCity === city ? 'wait' : 'pointer' }}
                                        >
                                            {deletingCity === city ? '⏳' : '🗑️ Excluir'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setSelectedCity(city); setBulkCity(city); setPanel('add'); setBairroNames(''); setExpandedCity(city); }}
                                            className="admin-btn admin-btn-ghost"
                                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                        >
                                            ➕ Bairros
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div>
                                        <div style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.05)' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)' }}>Excluir esta cidade e todos os {bairrosOnly.length} bairro(s)?</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCity(city, items); }}
                                                disabled={deletingCity === city}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', fontWeight: 600, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', borderRadius: '6px', cursor: deletingCity === city ? 'wait' : 'pointer' }}
                                            >
                                                {deletingCity === city ? '⏳ Excluindo...' : '🗑️ Excluir cidade e bairros'}
                                            </button>
                                        </div>
                                        {bairrosOnly.length === 0 ? (
                                            <div style={{ padding: '1rem 1rem 1rem 2.5rem', color: 'var(--admin-text-subtle)', fontSize: '0.85rem' }}>
                                                Nenhum bairro ainda. Clique em <strong>➕ Bairros</strong> para adicionar.
                                            </div>
                                        ) : (
                                            bairrosOnly.map((loc, idx) => (
                                                <div key={loc.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', paddingLeft: '2.5rem', borderBottom: idx < bairrosOnly.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                                                    {!loc.active && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBairros.has(loc.slug)}
                                                            onChange={() => toggleBairroSelection(loc.slug)}
                                                            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                        />
                                                    )}
                                                    {loc.active && <span style={{ width: 18 }} />}
                                                    <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>🏘️</span>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--admin-text)' }}>{loc.name}</span>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--admin-text-subtle)', fontFamily: 'monospace' }}>/{loc.slug}</span>
                                                    </div>
                                                    <button onClick={() => toggleActive(loc)} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', border: 'none', cursor: 'pointer', background: loc.active ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.12)', color: loc.active ? '#4ade80' : '#94a3b8' }}>
                                                        {loc.active ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                    <button onClick={() => handleDelete(loc.slug, loc.name)} disabled={deletingSlug === loc.slug} title="Excluir bairro" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', opacity: 0.8 }}>
                                                        {deletingSlug === loc.slug ? '⏳' : '🗑️'}
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        {/* Modal de confirmação */}
        {confirmModal && (
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => setConfirmModal(null)}
            >
                {/* Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

                {/* Caixa */}
                <div
                    style={{ position: 'relative', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '1.75rem', maxWidth: 420, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Ícone */}
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '1rem' }}>
                        🗑️
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text)', margin: '0 0 0.5rem 0' }}>
                        {confirmModal.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-subtle)', margin: '0 0 1.5rem 0', lineHeight: 1.55 }}>
                        {confirmModal.description}
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => setConfirmModal(null)}
                            className="admin-btn admin-btn-ghost"
                            style={{ fontSize: '0.875rem' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmModal.onConfirm}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1.1rem', fontWeight: 700, background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {confirmModal.label}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-subtle)', marginBottom: '0.35rem' };
