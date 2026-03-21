import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface PixelData {
    googleAnalyticsId: string;
    googleAnalyticsPropertyId: string;
    googleServiceAccount: string;
    facebookPixelId: string;
}

const EMPTY: PixelData = {
    googleAnalyticsId: '',
    googleAnalyticsPropertyId: '',
    googleServiceAccount: '',
    facebookPixelId: '',
};

interface Props {
    themeId?: string;
}

export default function PixelEditor({ themeId = 'classic' }: Props) {
    const [data, setData] = useState<PixelData>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        fetch(`/api/admin/singletons/pixels?themeId=${encodeURIComponent(themeId)}`)
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    setData({
                        googleAnalyticsId: res.data.googleAnalyticsId || '',
                        googleAnalyticsPropertyId: res.data.googleAnalyticsPropertyId || '',
                        googleServiceAccount: res.data.googleServiceAccount || '',
                        facebookPixelId: res.data.facebookPixelId || '',
                    });
                }
            })
            .catch(() => showToast('error', 'Erro', 'Não foi possível carregar as configurações.'))
            .finally(() => setLoading(false));
    }, [themeId]);

    const handleSave = async () => {
        if (data.googleServiceAccount) {
            try { JSON.parse(data.googleServiceAccount); }
            catch { showToast('error', 'JSON inválido', 'O conteúdo da Conta de Serviço não é um JSON válido.'); return; }
        }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/singletons/pixels', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, themeId }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('success', 'Salvo!', 'Configurações de rastreamento atualizadas.');
            } else {
                showToast('error', 'Erro ao salvar', json.error || 'Tente novamente.');
            }
        } catch {
            showToast('error', 'Erro de conexão', 'Não foi possível salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    const field = (key: keyof PixelData, value: string) =>
        setData(d => ({ ...d, [key]: value }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8">

                {/* ── Google Analytics ───────────────────────────────── */}
                <div className="admin-card p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="currentColor">
                                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#e5e5e5]">Google Analytics (GA4)</h2>
                            <p className="text-sm text-[#737373] mt-1">
                                Rastreie visitas e veja os dados diretamente neste painel.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Measurement ID */}
                        <div>
                            <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                ID de Medição <span className="text-[#525252] font-normal">(instala o rastreamento no site)</span>
                            </label>
                            <input
                                type="text"
                                value={data.googleAnalyticsId}
                                onChange={e => field('googleAnalyticsId', e.target.value.trim())}
                                placeholder="G-XXXXXXXXXX"
                                className="admin-input w-full font-mono"
                            />
                            <p className="text-xs text-[#525252] mt-1.5">
                                Analytics → Admin → Fluxos de dados → seu site → <strong className="text-[#737373]">ID de medição</strong>
                            </p>
                        </div>

                        {data.googleAnalyticsId && (
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                <span className="text-xs text-green-400">Rastreamento ativo: <strong>{data.googleAnalyticsId}</strong></span>
                            </div>
                        )}

                        <hr className="border-[rgba(255,255,255,0.06)]" />

                        {/* Property ID */}
                        <div>
                            <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                ID da Propriedade <span className="text-[#525252] font-normal">(para ver dados neste painel)</span>
                            </label>
                            <input
                                type="text"
                                value={data.googleAnalyticsPropertyId}
                                onChange={e => field('googleAnalyticsPropertyId', e.target.value.trim())}
                                placeholder="123456789"
                                className="admin-input w-full font-mono"
                            />
                            <p className="text-xs text-[#525252] mt-1.5">
                                Analytics → Admin → Detalhes da propriedade → <strong className="text-[#737373]">ID da propriedade</strong> (número, ex: 123456789)
                            </p>
                        </div>

                        {/* Service Account JSON */}
                        <div>
                            <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                                Conta de Serviço (JSON) <span className="text-[#525252] font-normal">(para ver dados neste painel)</span>
                            </label>
                            <textarea
                                value={data.googleServiceAccount}
                                onChange={e => field('googleServiceAccount', e.target.value)}
                                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "...",\n  ...\n}'}
                                rows={6}
                                className="admin-input w-full font-mono text-xs resize-y"
                            />
                            <p className="text-xs text-[#525252] mt-1.5">
                                Cole aqui o conteúdo do arquivo JSON baixado do Google Cloud Console.
                            </p>
                        </div>

                        {/* How-to: analytics */}
                        <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)]">
                            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-3">Como configurar o painel de Analytics</p>
                            <ol className="text-xs text-[#525252] space-y-1.5 list-decimal list-inside">
                                <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-orange-400 hover:underline">console.cloud.google.com</a> e crie (ou abra) um projeto</li>
                                <li>Ative a <strong className="text-[#737373]">Google Analytics Data API</strong> (Pesquise por "Analytics Data API")</li>
                                <li>Vá em <strong className="text-[#737373]">IAM e administração → Contas de serviço → Criar conta de serviço</strong></li>
                                <li>Crie a conta, clique nela → aba <strong className="text-[#737373]">Chaves → Adicionar chave → JSON</strong> — baixe o arquivo</li>
                                <li>No Google Analytics: <strong className="text-[#737373]">Admin → Gerenciamento de acesso à propriedade → Adicionar usuário</strong> — cole o e-mail da conta de serviço com papel <em>Leitor</em></li>
                                <li>Cole o JSON baixado no campo acima e salve</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* ── Meta Pixel ─────────────────────────────────────── */}
                <div className="admin-card p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#e5e5e5]">Meta Pixel (Facebook)</h2>
                            <p className="text-sm text-[#737373] mt-1">
                                Rastreie conversões de anúncios, otimize campanhas e alcance quem visitou seu site.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#a3a3a3] mb-2">ID do Pixel</label>
                            <input
                                type="text"
                                value={data.facebookPixelId}
                                onChange={e => field('facebookPixelId', e.target.value.trim())}
                                placeholder="123456789012345"
                                className="admin-input w-full font-mono"
                            />
                            <p className="text-xs text-[#525252] mt-1.5">
                                Meta Business Suite → Gerenciador de Eventos → seu Pixel → <strong className="text-[#737373]">ID do Pixel</strong>
                            </p>
                        </div>

                        {data.facebookPixelId && (
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                <span className="text-xs text-green-400">Meta Pixel configurado: <strong>{data.facebookPixelId}</strong></span>
                            </div>
                        )}

                        <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)]">
                            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-3">Como obter o ID</p>
                            <ol className="text-xs text-[#525252] space-y-1.5 list-decimal list-inside">
                                <li>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-blue-400 hover:underline">business.facebook.com</a></li>
                                <li>Clique em <strong className="text-[#737373]">Gerenciador de Eventos</strong> no menu lateral</li>
                                <li>Selecione ou crie um Pixel</li>
                                <li>O <strong className="text-[#737373]">ID do Pixel</strong> aparece abaixo do nome (número de 15 dígitos)</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* ── O que são pixels ───────────────────────────────── */}
                <div className="admin-card p-6 bg-[#0d0d0d]">
                    <h3 className="text-sm font-semibold text-[#737373] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>💡</span> O que são pixels de rastreamento?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#525252]">
                        <div className="space-y-2">
                            <p className="text-[#737373] font-medium">Google Analytics</p>
                            <p>Mostra quantas pessoas visitam seu site, de onde vieram, quais páginas leram e quanto tempo ficaram.</p>
                            <p className="text-green-400/70">✓ Gratuito · ✓ Dados de tráfego · ✓ Sem anúncios necessários</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[#737373] font-medium">Meta Pixel</p>
                            <p>Permite criar anúncios no Facebook/Instagram para quem já visitou seu site (remarketing) e mede conversões de campanhas.</p>
                            <p className="text-blue-400/70">✓ Remarketing · ✓ Conversões · ✓ Públicos personalizados</p>
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="admin-btn admin-btn-primary px-8 py-3 text-base"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </span>
                        ) : '💾 Salvar Configurações'}
                    </button>
                </div>
            </div>

            <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
