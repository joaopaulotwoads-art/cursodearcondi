import { useState, useEffect } from 'react';

interface Overview {
    sessions: number;
    users: number;
    pageviews: number;
    bounceRate: number;
    avgSessionDuration: number;
}

interface TopPage {
    path: string;
    title: string;
    pageviews: number;
    sessions: number;
}

interface AnalyticsData {
    overview: Overview;
    topPages: TopPage[];
    days: number;
}

function fmt(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDuration(seconds: number) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
    return (
        <div className="admin-card p-5">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-[#737373] uppercase tracking-wider font-semibold">{label}</span>
            </div>
            <p className="text-3xl font-bold text-[#e5e5e5] font-heading">{value}</p>
            {sub && <p className="text-xs text-[#525252] mt-1">{sub}</p>}
        </div>
    );
}

const RANGES = [
    { label: '7 dias', value: 7 },
    { label: '30 dias', value: 30 },
    { label: '90 dias', value: 90 },
];

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [days, setDays] = useState(30);

    const load = async (d: number) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/analytics?days=${d}`);
            const json = await res.json();
            if (json.success) {
                setData(json);
            } else {
                setError(json.error || 'Erro ao carregar dados');
            }
        } catch {
            setError('Erro de conexão com a API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(days); }, [days]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-sm text-[#737373]">Buscando dados do Google Analytics...</p>
            </div>
        );
    }

    if (error) {
        const isNotConfigured = error.toLowerCase().includes('não configurado') || error.toLowerCase().includes('nao configurado');
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6 max-w-lg mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl">
                    {isNotConfigured ? '⚙️' : '⚠️'}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">
                        {isNotConfigured ? 'Analytics não configurado' : 'Erro ao carregar dados'}
                    </h2>
                    <p className="text-sm text-[#737373] mb-6">{error}</p>
                    {isNotConfigured && (
                        <a href="/admin/pixels" className="admin-btn admin-btn-primary">
                            ⚙️ Configurar Pixels & Analytics
                        </a>
                    )}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { overview, topPages } = data;
    const maxPageviews = topPages[0]?.pageviews || 1;

    return (
        <div className="space-y-8">

            {/* Range selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-[#737373] mr-2">Período:</span>
                {RANGES.map(r => (
                    <button
                        key={r.value}
                        onClick={() => setDays(r.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            days === r.value
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'text-[#737373] hover:text-[#a3a3a3] border border-transparent'
                        }`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon="👤" label="Usuários" value={fmt(overview.users)} />
                <StatCard icon="🔁" label="Sessões" value={fmt(overview.sessions)} />
                <StatCard icon="📄" label="Pageviews" value={fmt(overview.pageviews)} />
                <StatCard
                    icon="↩️"
                    label="Taxa de Rejeição"
                    value={fmtPct(overview.bounceRate)}
                    sub="saíram sem interagir"
                />
                <StatCard
                    icon="⏱️"
                    label="Tempo Médio"
                    value={fmtDuration(overview.avgSessionDuration)}
                    sub="por sessão"
                />
            </div>

            {/* Top pages */}
            <div className="admin-card p-6">
                <h2 className="text-base font-bold text-[#e5e5e5] mb-6 flex items-center gap-2">
                    <span>📊</span> Páginas mais acessadas — últimos {days} dias
                </h2>

                {topPages.length === 0 ? (
                    <p className="text-sm text-[#525252] py-8 text-center">Nenhum dado de página disponível para este período.</p>
                ) : (
                    <div className="space-y-3">
                        {topPages.map((page, i) => (
                            <div key={page.path} className="flex items-center gap-4">
                                <span className="text-xs text-[#525252] w-5 text-right flex-shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="min-w-0">
                                            <span className="text-sm text-[#e5e5e5] font-medium truncate block">
                                                {page.title || page.path}
                                            </span>
                                            <span className="text-xs text-[#525252] font-mono truncate block">{page.path}</span>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                            <span className="text-sm font-bold text-orange-400">{fmt(page.pageviews)}</span>
                                            <span className="text-xs text-[#525252] hidden sm:block">views</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                                            style={{ width: `${(page.pageviews / maxPageviews) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Link para GA completo */}
            <div className="flex justify-end">
                <a
                    href="https://analytics.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-ghost text-sm"
                >
                    Abrir Google Analytics completo →
                </a>
            </div>
        </div>
    );
}
