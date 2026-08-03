/**
 * LocalHomeEditor.tsx
 *
 * Editor React para o conteúdo da home do Modo Local (rank and rent).
 * Permite editar todas as seções da home local com upload de imagens:
 *   - Informações NAP (Nome, Endereço, Telefone)
 *   - Hero Section (badge, título, imagem de fundo, subtítulo, CTAs)
 *   - Prova Social (logos de clientes com upload individual)
 *   - Serviços em destaque (seleção a partir dos cadastrados)
 *   - Quem Somos (imagem com upload, texto, stats)
 *   - Localização (endereço, embed do mapa)
 *   - CTA WhatsApp
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';
import AdminImagePreview from './AdminImagePreview';

interface ClientLogo { name: string; logo: string; }
interface AboutStat  { number: string; label: string; }

interface LocalHomeData {
    companyName?: string;
    companyPhone?: string;
    companyWhatsapp?: string;
    companyEmail?: string;
    companyAddress?: string;
    companyCity?: string;
    companyState?: string;
    companyCEP?: string;
    heroBadge?: string;
    heroTitle?: string;
    heroTitleHighlight?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaSecondaryText?: string;
    heroWhatsappMessage?: string;
    heroBackground?: string;
    socialTitle?: string;
    socialProofActive?: boolean;
    clients?: ClientLogo[];
    servicesTitle?: string;
    servicesSubtitle?: string;
    featuredServices?: string[];
    aboutTitle?: string;
    aboutSubtitle?: string;
    aboutText?: string;
    aboutImage?: string;
    aboutStats?: AboutStat[];
    locationTitle?: string;
    locationAddress?: string;
    locationMapEmbed?: string;
    ctaTitle?: string;
    ctaText?: string;
    ctaButtonText?: string;
    ctaWhatsappMessage?: string;
    formTitle?: string;
    formSubtitle?: string;
    formNamePlaceholder?: string;
    formPhonePlaceholder?: string;
    formMessagePlaceholder?: string;
    formButtonText?: string;
    trustBadges?: string[];
    ctaFooterTitle?: string;
    ctaFooterSubtitle?: string;
}

interface AvailableService { title: string; slug: string; icon?: string; }

interface Props {
    initialData?: LocalHomeData;
    availableServices?: AvailableService[];
}

export default function LocalHomeEditor({ initialData, availableServices = [] }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [isMounted, setIsMounted]   = useState(false);
    const [isSaving, setIsSaving]     = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [previewBlobByField, setPreviewBlobByField] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab]   = useState<'nap' | 'hero' | 'services' | 'about' | 'location' | 'cta' | 'form'>('nap');

    const [data, setData] = useState<LocalHomeData>({
        companyName: '', companyPhone: '', companyWhatsapp: '',
        companyEmail: '', companyAddress: '', companyCity: '',
        companyState: '', companyCEP: '',
        heroBadge: '', heroTitle: '', heroTitleHighlight: '', heroSubtitle: '',
        heroCtaText: 'Falar no WhatsApp', heroCtaSecondaryText: 'Ver nossos serviços',
        heroWhatsappMessage: 'Olá! Vim pelo site e gostaria de um orçamento.',
        heroBackground: '',
        socialTitle: 'Empresas que confiam em nós',
        socialProofActive: true,
        clients: [{ name: '', logo: '' }],
        servicesTitle: 'Nossos Serviços', servicesSubtitle: '',
        featuredServices: [],
        aboutTitle: 'Sobre Nós', aboutSubtitle: '', aboutText: '', aboutImage: '',
        aboutStats: [{ number: '', label: '' }],
        locationTitle: 'Nossa Localização', locationAddress: '', locationMapEmbed: '',
        ctaTitle: 'Precisa de ajuda agora?', ctaText: '', ctaButtonText: 'Chamar no WhatsApp',
        ctaWhatsappMessage: 'Olá! Preciso de ajuda. Podem me atender?',
    });

    useEffect(() => {
        setIsMounted(true);
        if (initialData) setData(prev => ({ ...prev, ...initialData }));
    }, []);

    const set = (field: keyof LocalHomeData, value: any) =>
        setData(prev => ({ ...prev, [field]: value }));

    // Upload genérico de imagem para um campo do data
    const handleImageUpload = async (
        field: keyof LocalHomeData,
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        setPreviewBlobByField(prev => ({ ...prev, [field]: blobUrl }));
        setUploadingField(String(field));
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');
        try {
            const res    = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                set(field, result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch {
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        } finally {
            URL.revokeObjectURL(blobUrl);
            setPreviewBlobByField(prev => {
                const next = { ...prev }; delete next[field]; return next;
            });
            setUploadingField(null);
            e.target.value = '';
        }
    };

    // Upload de logo de cliente por índice
    const handleClientLogoUpload = async (
        idx: number,
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const key = `client-logo-${idx}`;
        const blobUrl = URL.createObjectURL(file);
        setPreviewBlobByField(prev => ({ ...prev, [key]: blobUrl }));
        setUploadingField(key);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');
        try {
            const res    = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                const updated = [...(data.clients || [])];
                updated[idx]  = { ...updated[idx], logo: result.url };
                set('clients', updated);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar o logo');
            }
        } catch {
            showToast('error', 'Erro no upload', 'Não foi possível enviar o logo');
        } finally {
            URL.revokeObjectURL(blobUrl);
            setPreviewBlobByField(prev => {
                const next = { ...prev }; delete next[key]; return next;
            });
            setUploadingField(null);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/singletons/home', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themeId: 'local', data }),
            });
            const result = await res.json();
            if (result.success) {
                showToast('success', 'Home local salva com sucesso!');
            } else {
                showToast('error', 'Erro ao salvar', result.error || 'Erro desconhecido');
            }
        } catch {
            showToast('error', 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'nap',      label: '🏢 Empresa' },
        { id: 'hero',     label: '🎯 Hero' },
        { id: 'services', label: '🔧 Serviços' },
        { id: 'about',    label: '👥 Quem Somos' },
        { id: 'location', label: '📍 Localização' },
        { id: 'cta',      label: '💬 CTA' },
        { id: 'form',     label: '📋 Formulário' },
    ] as const;

    // Componente reutilizável de upload de imagem
    const ImageUploadField = ({
        label,
        value,
        fieldKey,
        previewBlobUrl,
        onUpload,
        onRemove,
        hint,
    }: {
        label: string;
        value?: string;
        fieldKey: string;
        previewBlobUrl?: string | null;
        onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onRemove: () => void;
        hint?: string;
    }) => {
        const isUploading = uploadingField === fieldKey;
        return (
            <div>
                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">{label}</label>
                {(value || previewBlobUrl) ? (
                    <div className="mb-3">
                        <div className="relative inline-block">
                            <AdminImagePreview
                                src={value || ''}
                                previewBlobUrl={previewBlobUrl}
                                alt={label}
                                className="max-w-xs max-h-40 rounded-lg object-cover border border-[rgba(255,255,255,0.1)]"
                            />
                            <button
                                onClick={onRemove}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500 shadow"
                                title="Remover imagem"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ) : null}
                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] hover:border-primary/60 transition-colors text-sm text-[#a3a3a3] hover:text-[#e5e5e5] w-fit ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {isUploading ? (
                        <><span className="animate-spin">⏳</span> Enviando...</>
                    ) : (
                        <><span>📷</span> {value ? 'Trocar imagem' : 'Enviar imagem'}</>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onUpload}
                        className="hidden"
                        disabled={isUploading}
                    />
                </label>
                {hint && <p className="text-xs text-[#737373] mt-1.5">{hint}</p>}
            </div>
        );
    };

    if (!isMounted) {
        return (
            <div style={{ minHeight: 400 }} className="flex items-center justify-center">
                <p className="text-[#a3a3a3]">Carregando editor...</p>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">Home Local</h2>
                    <p className="text-sm text-[#a3a3a3]">Configure todas as seções da página inicial do Modo Local</p>
                </div>
                <div className="flex gap-2">
                    <a href="/" target="_blank" className="admin-btn admin-btn-ghost">👁️ Ver Site</a>
                    <button onClick={handleSave} disabled={isSaving} className="admin-btn admin-btn-primary disabled:opacity-50">
                        {isSaving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-[rgba(255,255,255,0.08)] pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-t transition-colors ${
                            activeTab === tab.id
                                ? 'border-b-2 border-primary text-[#e5e5e5] bg-[#111111]'
                                : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
                        }`}
                        style={activeTab === tab.id ? { borderBottomColor: 'var(--primary)' } : {}}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── NAP (Empresa) ─────────────────────────────────── */}
            {activeTab === 'nap' && (
                <div className="admin-card p-6 space-y-5">
                    <p className="text-sm text-[#a3a3a3] mb-4">
                        NAP (Name, Address, Phone) — dados usados em todo o site e no schema JSON-LD para SEO local.
                    </p>
                    <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <p className="text-sm text-[#86efac]">
                            <strong>📞 Telefone e WhatsApp:</strong> Configure em{' '}
                            <a href="/admin/configuracoes?tab=contato" className="underline font-semibold hover:text-white">
                                Configurações → Contato
                            </a>
                            {' '}para manter um único número em todo o site.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            { label: 'Nome da Empresa *', field: 'companyName', placeholder: 'Ex: Hidráulica Silva' },
                            { label: 'E-mail', field: 'companyEmail', placeholder: 'contato@empresa.com' },
                            { label: 'Endereço (rua e número)', field: 'companyAddress', placeholder: 'Rua das Flores, 123' },
                            { label: 'Cidade', field: 'companyCity', placeholder: 'São Paulo' },
                            { label: 'Estado (UF)', field: 'companyState', placeholder: 'SP' },
                            { label: 'CEP', field: 'companyCEP', placeholder: '01000-000' },
                        ].map(({ label, field, placeholder }) => (
                            <div key={field}>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">{label}</label>
                                <input
                                    type="text"
                                    value={(data as any)[field] || ''}
                                    onChange={e => set(field as any, e.target.value)}
                                    className="admin-input w-full"
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Hero ─────────────────────────────────────────── */}
            {activeTab === 'hero' && (
                <div className="admin-card p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge (destaque acima do título)</label>
                            <input type="text" value={data.heroBadge || ''} onChange={e => set('heroBadge', e.target.value)} className="admin-input w-full" placeholder="⭐ Melhor avaliado da região" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título Principal</label>
                            <input type="text" value={data.heroTitle || ''} onChange={e => set('heroTitle', e.target.value)} className="admin-input w-full" placeholder="Especialistas em Serviços" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Parte em destaque (gradiente azul)</label>
                            <input type="text" value={data.heroTitleHighlight || ''} onChange={e => set('heroTitleHighlight', e.target.value)} className="admin-input w-full" placeholder="em São Paulo" />
                                        <p className="text-xs text-[#737373] mt-1">Deixe vazio para usar automaticamente a cidade com mais bairros cadastrados.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do botão WhatsApp</label>
                            <input type="text" value={data.heroCtaText || ''} onChange={e => set('heroCtaText', e.target.value)} className="admin-input w-full" placeholder="Falar no WhatsApp" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                        <textarea value={data.heroSubtitle || ''} onChange={e => set('heroSubtitle', e.target.value)} className="admin-input w-full resize-none" rows={3} placeholder="Atendimento rápido, qualidade garantida e preço justo." />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Mensagem padrão do WhatsApp (hero)</label>
                        <input type="text" value={data.heroWhatsappMessage || ''} onChange={e => set('heroWhatsappMessage', e.target.value)} className="admin-input w-full" placeholder="Olá! Vim pelo site e gostaria de um orçamento." />
                        <p className="text-xs text-[#737373] mt-1">Enviada ao clicar no botão WhatsApp do hero.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do botão secundário (opcional)</label>
                        <input type="text" value={data.heroCtaSecondaryText || ''} onChange={e => set('heroCtaSecondaryText', e.target.value)} className="admin-input w-full" placeholder="Ver nossos serviços" />
                    </div>

                    {/* Imagem de fundo do Hero */}
                    <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
                        <ImageUploadField
                            label="Imagem de Fundo do Hero (opcional)"
                            value={data.heroBackground}
                            fieldKey="heroBackground"
                            previewBlobUrl={previewBlobByField['heroBackground']}
                            onUpload={e => handleImageUpload('heroBackground', e)}
                            onRemove={() => set('heroBackground', '')}
                            hint="Substitui o gradiente azul padrão. Recomendado: 1920×1080px, formato JPG ou WebP."
                        />
                    </div>
                </div>
            )}

            {/* ── Serviços ─────────────────────────────────────── */}
            {activeTab === 'services' && (
                <div className="space-y-5">
                    <div className="admin-card p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título da seção</label>
                                <input type="text" value={data.servicesTitle || ''} onChange={e => set('servicesTitle', e.target.value)} className="admin-input w-full" placeholder="Nossos Serviços" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo da seção</label>
                                <input type="text" value={data.servicesSubtitle || ''} onChange={e => set('servicesSubtitle', e.target.value)} className="admin-input w-full" placeholder="Soluções completas para você" />
                            </div>
                        </div>
                    </div>

                    <div className="admin-card p-5">
                        <h3 className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">
                            Serviços em Destaque (até 6)
                        </h3>
                        <p className="text-xs text-[#737373] mb-4">
                            Selecione até 6 serviços. Aparecem na <strong>Home</strong>, no <strong>rodapé</strong> e no <strong>menu Serviços</strong> do header. Ordem = prioridade.
                        </p>
                        {availableServices.length === 0 ? (
                            <div className="text-sm text-[#a3a3a3] p-4 bg-[#111111] rounded-lg">
                                Nenhum serviço cadastrado ainda.{' '}
                                <a href="/admin/services/new" className="text-blue-400 hover:underline">Criar serviço →</a>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {availableServices.map(service => {
                                    const isSelected = (data.featuredServices || []).includes(service.slug);
                                    return (
                                        <label
                                            key={service.slug}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                                                isSelected
                                                    ? 'border-primary/60 bg-primary/10'
                                                    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                                            }`}
                                            style={isSelected ? { borderColor: 'var(--primary)' } : {}}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={!isSelected && (data.featuredServices || []).length >= 6}
                                                onChange={e => {
                                                    const current = data.featuredServices || [];
                                                    set('featuredServices', e.target.checked
                                                        ? [...current, service.slug].slice(0, 6)
                                                        : current.filter(s => s !== service.slug));
                                                }}
                                                className="w-4 h-4 rounded accent-primary disabled:opacity-50"
                                            />
                                            {service.icon && <span className="text-xl">{service.icon}</span>}
                                            <span className="text-sm text-[#e5e5e5] font-medium">{service.title}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Prova Social / Logos de clientes */}
                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">Logos de Clientes</h3>
                            <button
                                onClick={() => set('clients', [...(data.clients || []), { name: '', logo: '' }])}
                                className="text-xs admin-btn admin-btn-secondary py-1 px-3"
                            >
                                + Adicionar
                            </button>
                        </div>
                        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)]">
                            <div>
                                <p className="text-sm font-semibold text-[#e5e5e5]">Exibir seção &quot;Empresas que confiam em nós&quot;</p>
                                <p className="text-xs text-[#737373] mt-0.5">Mostra a seção de logos na Home</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => set('socialProofActive', !(data.socialProofActive !== false))}
                                className={`relative w-11 h-6 rounded-full transition-colors ${data.socialProofActive !== false ? 'bg-green-600' : 'bg-[#3f3f3f]'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data.socialProofActive !== false ? 'left-5' : 'left-0.5'}`} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título da seção de logos</label>
                            <input type="text" value={data.socialTitle || ''} onChange={e => set('socialTitle', e.target.value)} className="admin-input w-full" placeholder="Empresas que confiam em nós" />
                        </div>
                        <div className="space-y-4">
                            {(data.clients || []).map((client, idx) => {
                                const isUploading = uploadingField === `client-logo-${idx}`;
                                return (
                                    <div key={idx} className="p-3 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] space-y-3">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={client.name}
                                                onChange={e => {
                                                    const updated = [...(data.clients || [])];
                                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                                    set('clients', updated);
                                                }}
                                                className="admin-input flex-1 text-sm"
                                                placeholder="Nome do cliente"
                                            />
                                            {(data.clients || []).length > 1 && (
                                                <button
                                                    onClick={() => set('clients', (data.clients || []).filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-300 text-lg flex-shrink-0"
                                                >×</button>
                                            )}
                                        </div>
                                        {/* Upload do logo */}
                                        <div className="flex items-center gap-3">
                                            {(client.logo || previewBlobByField[`client-logo-${idx}`]) ? (
                                                <div className="flex items-center gap-3">
                                                    <AdminImagePreview
                                                        src={client.logo || ''}
                                                        previewBlobUrl={previewBlobByField[`client-logo-${idx}`]}
                                                        alt={client.name || 'Logo'}
                                                        className="h-10 w-auto max-w-[120px] object-contain rounded border border-[rgba(255,255,255,0.1)] bg-white/5 p-1"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const updated = [...(data.clients || [])];
                                                            updated[idx] = { ...updated[idx], logo: '' };
                                                            set('clients', updated);
                                                        }}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Remover logo
                                                    </button>
                                                </div>
                                            ) : null}
                                            <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] hover:border-primary/60 transition-colors text-xs text-[#a3a3a3] hover:text-[#e5e5e5] ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                                                {isUploading ? (
                                                    <><span className="animate-spin">⏳</span> Enviando...</>
                                                ) : (
                                                    <><span>📷</span> {(client.logo || previewBlobByField[`client-logo-${idx}`]) ? 'Trocar logo' : 'Enviar logo'}</>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => handleClientLogoUpload(idx, e)}
                                                    className="hidden"
                                                    disabled={isUploading}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Quem Somos ───────────────────────────────────── */}
            {activeTab === 'about' && (
                <div className="space-y-5">
                    <div className="admin-card p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                                <input type="text" value={data.aboutTitle || ''} onChange={e => set('aboutTitle', e.target.value)} className="admin-input w-full" placeholder="Sobre Nós" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                                <input type="text" value={data.aboutSubtitle || ''} onChange={e => set('aboutSubtitle', e.target.value)} className="admin-input w-full" placeholder="Conheça nossa história" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto</label>
                            <textarea value={data.aboutText || ''} onChange={e => set('aboutText', e.target.value)} className="admin-input w-full resize-y" rows={5} placeholder="Somos especialistas com mais de 10 anos de experiência..." />
                        </div>

                        {/* Imagem da seção Quem Somos */}
                        <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
                            <ImageUploadField
                                label="Imagem (coluna esquerda da seção)"
                                value={data.aboutImage}
                                fieldKey="aboutImage"
                                previewBlobUrl={previewBlobByField['aboutImage']}
                                onUpload={e => handleImageUpload('aboutImage', e)}
                                onRemove={() => set('aboutImage', '')}
                                hint="Aparece ao lado do texto. Recomendado: proporção 4:3, mínimo 800×600px."
                            />
                        </div>
                    </div>

                    <div className="admin-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">Estatísticas</h3>
                            <button
                                onClick={() => set('aboutStats', [...(data.aboutStats || []), { number: '', label: '' }])}
                                className="text-xs admin-btn admin-btn-secondary py-1 px-3"
                            >+ Adicionar</button>
                        </div>
                        <div className="space-y-3">
                            {(data.aboutStats || []).map((stat, idx) => (
                                <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: '100px 1fr 30px' }}>
                                    <input
                                        type="text"
                                        value={stat.number}
                                        onChange={e => {
                                            const updated = [...(data.aboutStats || [])];
                                            updated[idx] = { ...updated[idx], number: e.target.value };
                                            set('aboutStats', updated);
                                        }}
                                        className="admin-input text-center font-bold"
                                        placeholder="10+"
                                    />
                                    <input
                                        type="text"
                                        value={stat.label}
                                        onChange={e => {
                                            const updated = [...(data.aboutStats || [])];
                                            updated[idx] = { ...updated[idx], label: e.target.value };
                                            set('aboutStats', updated);
                                        }}
                                        className="admin-input text-sm"
                                        placeholder="Anos de experiência"
                                    />
                                    {(data.aboutStats || []).length > 1 ? (
                                        <button
                                            onClick={() => set('aboutStats', (data.aboutStats || []).filter((_, i) => i !== idx))}
                                            className="text-red-400 hover:text-red-300 text-lg flex items-center justify-center"
                                        >×</button>
                                    ) : <span />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Localização ─────────────────────────────────── */}
            {activeTab === 'location' && (
                <div className="admin-card p-5 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título da seção</label>
                        <input type="text" value={data.locationTitle || ''} onChange={e => set('locationTitle', e.target.value)} className="admin-input w-full" placeholder="Nossa Localização" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Endereço completo (exibido na seção)</label>
                        <input type="text" value={data.locationAddress || ''} onChange={e => set('locationAddress', e.target.value)} className="admin-input w-full" placeholder="Rua das Flores, 123 - Bairro - São Paulo/SP" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Embed do Google Maps (URL do iframe)</label>
                        <textarea
                            value={data.locationMapEmbed || ''}
                            onChange={e => set('locationMapEmbed', e.target.value)}
                            className="admin-input w-full resize-none font-mono text-xs"
                            rows={3}
                            placeholder="https://www.google.com/maps/embed?pb=..."
                        />
                        <p className="text-xs text-[#737373] mt-2">
                            No Google Maps: clique em Compartilhar → Incorporar mapa → copie apenas o src="" do iframe.
                        </p>
                    </div>
                </div>
            )}

            {/* ── CTA WhatsApp ────────────────────────────────── */}
            {activeTab === 'cta' && (
                <div className="admin-card p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título do CTA</label>
                            <input type="text" value={data.ctaTitle || ''} onChange={e => set('ctaTitle', e.target.value)} className="admin-input w-full" placeholder="Precisa de ajuda agora?" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do botão</label>
                            <input type="text" value={data.ctaButtonText || ''} onChange={e => set('ctaButtonText', e.target.value)} className="admin-input w-full" placeholder="Chamar no WhatsApp" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do CTA</label>
                        <textarea value={data.ctaText || ''} onChange={e => set('ctaText', e.target.value)} className="admin-input w-full resize-none" rows={3} placeholder="Nossa equipe está disponível 24h. Clique abaixo!" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Mensagem WhatsApp do CTA</label>
                        <input type="text" value={data.ctaWhatsappMessage || ''} onChange={e => set('ctaWhatsappMessage', e.target.value)} className="admin-input w-full" placeholder="Olá! Preciso de ajuda. Podem me atender?" />
                    </div>
                    <hr className="border-[rgba(255,255,255,0.08)]" />
                    <p className="text-xs text-[#a3a3a3]">Textos do rodapé CTA (seção final das páginas de serviço)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título CTA Rodapé</label>
                            <input type="text" value={data.ctaFooterTitle || ''} onChange={e => set('ctaFooterTitle', e.target.value)} className="admin-input w-full" placeholder="Orçamento gratuito em" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo CTA Rodapé</label>
                            <input type="text" value={data.ctaFooterSubtitle || ''} onChange={e => set('ctaFooterSubtitle', e.target.value)} className="admin-input w-full" placeholder="Atendemos rápido. Resposta em minutos, sem compromisso." />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Formulário & Selos ────────────────────────────── */}
            {activeTab === 'form' && (
                <div className="admin-card p-5 space-y-5">
                    <p className="text-sm text-[#a3a3a3]">Textos do formulário de orçamento e selos de confiança exibidos na sidebar das páginas de serviço.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título do Formulário</label>
                            <input type="text" value={data.formTitle || ''} onChange={e => set('formTitle', e.target.value)} className="admin-input w-full" placeholder="Orçamento Gratuito" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo do Formulário</label>
                            <input type="text" value={data.formSubtitle || ''} onChange={e => set('formSubtitle', e.target.value)} className="admin-input w-full" placeholder="Resposta em minutos · Sem compromisso" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Placeholder: Nome</label>
                            <input type="text" value={data.formNamePlaceholder || ''} onChange={e => set('formNamePlaceholder', e.target.value)} className="admin-input w-full" placeholder="Seu nome" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Placeholder: Telefone</label>
                            <input type="text" value={data.formPhonePlaceholder || ''} onChange={e => set('formPhonePlaceholder', e.target.value)} className="admin-input w-full" placeholder="Seu telefone / WhatsApp" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Placeholder: Mensagem</label>
                            <input type="text" value={data.formMessagePlaceholder || ''} onChange={e => set('formMessagePlaceholder', e.target.value)} className="admin-input w-full" placeholder="Descreva o que você precisa" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do Botão</label>
                        <input type="text" value={data.formButtonText || ''} onChange={e => set('formButtonText', e.target.value)} className="admin-input w-full" placeholder="Enviar pelo WhatsApp" />
                    </div>

                    <hr className="border-[rgba(255,255,255,0.08)]" />

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-semibold text-[#e5e5e5]">Selos de Confiança</label>
                            <button type="button" onClick={() => set('trustBadges', [...(data.trustBadges || []), ''])} className="text-xs text-blue-400 hover:text-blue-300">+ Adicionar selo</button>
                        </div>
                        <p className="text-xs text-[#a3a3a3] mb-3">Use emojis no início para ícones visuais (ex: ✅ Orçamento gratuito)</p>
                        <div className="space-y-2">
                            {(data.trustBadges || ['✅ Orçamento gratuito', '⚡ Resposta rápida', '🔒 Sem spam', '⭐ Atendimento local']).map((badge, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={badge}
                                        onChange={e => {
                                            const updated = [...(data.trustBadges || [])];
                                            updated[idx] = e.target.value;
                                            set('trustBadges', updated);
                                        }}
                                        className="admin-input flex-1"
                                        placeholder="✅ Texto do selo"
                                    />
                                    {(data.trustBadges || []).length > 1 && (
                                        <button type="button" onClick={() => set('trustBadges', (data.trustBadges || []).filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
