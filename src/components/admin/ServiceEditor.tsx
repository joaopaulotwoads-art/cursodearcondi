/**
 * ServiceEditor.tsx
 *
 * Editor React para criar e editar Keywords (Serviços) do Modo Local.
 * Organizado em 3 abas:
 *   1. 📝 Informações — dados básicos, hero, benefícios, SEO, imagem
 *   2. 🔍 Outline     — estrutura da página extraída de concorrentes ou manual
 *   3. ✍️ Conteúdo    — geração de conteúdo com IA baseado na outline
 *
 * Abas Outline e Conteúdo só aparecem no modo edição (quando o serviço já existe).
 * Usado nas páginas /admin/services/new e /admin/services/[slug].
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';
import ServiceEditorOutline from './ServiceEditorOutline';
import ServiceEditorConteudo from './ServiceEditorConteudo';
import AdminImagePreview from './AdminImagePreview';
import type { ChangeEvent } from 'react';

interface OutlineItem { level: 'h1' | 'h2' | 'h3' | 'h4'; text: string; }

interface ServiceData {
    niche?: string;
    title: string;
    slug: string;
    icon?: string;
    shortDescription?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    description?: string;
    benefits?: string[];
    metaTitle?: string;
    metaDescription?: string;
    active?: boolean;
    image?: string;
    thumbnail?: string;
    outline?: OutlineItem[];
    generatedContent?: string;
    contentGeneratedAt?: string;
}

interface Props {
    service?: ServiceData;
}

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function ServiceEditor({ service }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle]               = useState('');
    const [slug, setSlug]                 = useState('');
    const [icon, setIcon]                 = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [heroTitle, setHeroTitle]       = useState('');
    const [heroSubtitle, setHeroSubtitle] = useState('');
    const [description, setDescription]   = useState('');
    const [benefits, setBenefits]         = useState<string[]>(['']);
    const [metaTitle, setMetaTitle]       = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [active, setActive]             = useState(true);
    const [image, setImage]               = useState('');
    const [thumbnail, setThumbnail]       = useState('');
    const [slugManual, setSlugManual]     = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [thumbnailPreviewBlob, setThumbnailPreviewBlob] = useState<string | null>(null);
    const [activeTab, setActiveTab]       = useState<'info' | 'outline' | 'conteudo'>('info');
    const [currentOutline, setCurrentOutline] = useState<OutlineItem[]>([]);

    // Lê query string: ?tab=outline|conteudo abre aba direto
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const preTab = params.get('tab') as 'outline' | 'conteudo' | null;
        if (preTab && (preTab === 'outline' || preTab === 'conteudo') && service) setActiveTab(preTab);
    }, []);

    useEffect(() => {
        setIsMounted(true);
        if (service) {
            setTitle(service.title || '');
            setSlug(service.slug || '');
            setSlugManual(true);
            setIcon(service.icon || '');
            setShortDescription(service.shortDescription || '');
            setHeroTitle(service.heroTitle || '');
            setHeroSubtitle(service.heroSubtitle || '');
            setDescription(service.description || '');
            setBenefits(service.benefits?.length ? service.benefits : ['']);
            setMetaTitle(service.metaTitle || '');
            setMetaDescription(service.metaDescription || '');
            setActive(service.active !== false);
            setImage(service.image || '');
            setThumbnail(service.thumbnail || '');
            setCurrentOutline(service.outline || []);
        }
    }, []);

    useEffect(() => {
        if (!slugManual && title) {
            setSlug(generateSlug(title));
        }
    }, [title, slugManual]);

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');
        try {
            const res    = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                setImage(result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch {
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        } finally {
            setIsUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleThumbnailUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        setThumbnailPreviewBlob(blobUrl);
        setIsUploadingThumbnail(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');
        try {
            const res    = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                setThumbnail(result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a thumbnail');
            }
        } catch {
            showToast('error', 'Erro no upload', 'Não foi possível enviar a thumbnail');
        } finally {
            URL.revokeObjectURL(blobUrl);
            setThumbnailPreviewBlob(null);
            setIsUploadingThumbnail(false);
            e.target.value = '';
        }
    };

    const handleBenefitChange = (idx: number, value: string) => {
        setBenefits(prev => prev.map((b, i) => i === idx ? value : b));
    };

    const addBenefit = () => setBenefits(prev => [...prev, '']);
    const removeBenefit = (idx: number) => {
        setBenefits(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!title || !slug) {
            showToast('warning', 'Campos obrigatórios', 'Título e slug são obrigatórios');
            return;
        }

        setIsSaving(true);
        try {
            const cleanBenefits = benefits.filter(b => b.trim() !== '');
            const url    = service ? `/api/admin/services/${service.slug}` : '/api/admin/services';
            const method = service ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    slug,
                    newSlug: service && slug !== service.slug ? slug : undefined,
                    icon:             icon || undefined,
                    shortDescription: shortDescription || undefined,
                    heroTitle:        heroTitle || undefined,
                    heroSubtitle:     heroSubtitle || undefined,
                    description:      description || undefined,
                    benefits:         cleanBenefits.length > 0 ? cleanBenefits : undefined,
                    metaTitle:        metaTitle || undefined,
                    metaDescription:  metaDescription || undefined,
                    active,
                    image:            image || undefined,
                    thumbnail:        thumbnail || undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                if (service) {
                    // Edição: feedback rápido, sem redirecionar
                    showToast('success', 'Keyword atualizada!');
                    setIsSaving(false);
                } else {
                    // Criação: vai direto para a aba Outline da keyword criada
                    showToast('success', 'Keyword criada! Agora configure a estrutura da página.');
                    const targetSlug = data.slug || slug;
                    setTimeout(() => {
                        window.location.href = `/admin/services/${targetSlug}?tab=outline`;
                    }, 700);
                }
            } else {
                showToast('error', 'Erro ao salvar', data.error || 'Erro desconhecido');
            }
        } catch (err) {
            console.error('❌ Erro ao salvar serviço:', err);
            showToast('error', 'Erro ao salvar serviço');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isMounted) {
        return (
            <div style={{ minHeight: 400 }} className="flex items-center justify-center">
                <p className="text-[#a3a3a3]">Carregando editor...</p>
            </div>
        );
    }

    const isEditing = !!service;

    return (
        <>
        <div className="space-y-6">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        {service ? 'Editar Keyword' : 'Nova Keyword'}
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        {service ? `Editando: ${service.title}` : 'Cadastre uma nova keyword para o site local'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.location.href = '/admin/gerar-paginas?tab=keywords'} className="admin-btn admin-btn-secondary">
                        Cancelar
                    </button>
                    {activeTab === 'info' && (
                        <button onClick={handleSave} disabled={isSaving} className="admin-btn admin-btn-primary disabled:opacity-50">
                            {isSaving ? 'Salvando...' : (isEditing ? '💾 Salvar' : 'Próximo →')}
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de progresso — aparece sempre (criação e edição) */}
            {(() => {
                const hasOutline = currentOutline.filter(o => o.text).length > 0;
                const hasContent = !!service?.generatedContent;
                const steps = [
                    { step: 1, label: 'Informações', key: 'info'     as const, done: isEditing },
                    { step: 2, label: 'Outline',     key: 'outline'  as const, done: hasOutline },
                    { step: 3, label: 'Conteúdo',    key: 'conteudo' as const, done: hasContent },
                ];
                const currentStep = !isEditing ? 1 : activeTab === 'outline' ? 2 : activeTab === 'conteudo' ? 3 : 1;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.85rem 1.25rem', border: '1px solid var(--admin-border)' }}>
                        {steps.map((s, i) => (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isEditing ? 'pointer' : 'default' }}
                                    onClick={() => isEditing && setActiveTab(s.key)}
                                >
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700,
                                        background: s.done ? 'rgba(74,222,128,0.18)' : currentStep === s.step ? 'rgba(99,102,241,0.2)' : 'transparent',
                                        border: `2px solid ${s.done ? '#4ade80' : currentStep === s.step ? 'var(--primary)' : 'var(--admin-border)'}`,
                                        color: s.done ? '#4ade80' : currentStep === s.step ? 'var(--primary)' : 'var(--admin-text-subtle)',
                                        transition: 'all 0.2s',
                                    }}>
                                        {s.done ? '✓' : s.step}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: s.done ? '#4ade80' : currentStep === s.step ? 'var(--admin-text)' : 'var(--admin-text-subtle)', margin: 0, lineHeight: 1.2 }}>{s.label}</p>
                                        <p style={{ fontSize: '0.68rem', color: 'var(--admin-text-subtle)', margin: 0, lineHeight: 1.2 }}>
                                            {s.step === 1 ? 'Título e configurações' : s.step === 2 ? 'Estrutura da página' : 'Texto com IA'}
                                        </p>
                                    </div>
                                </div>
                                {i < 2 && (
                                    <div style={{ flex: 1, height: 2, margin: '0 0.75rem', borderRadius: 2, background: steps[i].done ? 'rgba(74,222,128,0.4)' : 'var(--admin-border)', transition: 'background 0.3s' }} />
                                )}
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Banner guia no passo 1 (criação) */}
            {!isEditing && (
                <div style={{ padding: '0.9rem 1.1rem', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🔑</span>
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.2rem' }}>Passo 1 de 3 — Informações básicas</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-subtle)', lineHeight: 1.6, margin: 0 }}>
                            Digite o nome da keyword (ex: <em>"aluguel de gerador 20kva"</em>) e clique em <strong style={{ color: 'var(--admin-text)' }}>Próximo →</strong>.
                            Depois vamos montar a estrutura da página.
                        </p>
                    </div>
                </div>
            )}

            {/* Abas (só no modo edição) */}
            {isEditing && (() => {
                const hasOutline = currentOutline.filter(o => o.text).length > 0;
                const hasContent = !!service?.generatedContent;
                return (
                    <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1.5rem' }}>
                        {([
                            { key: 'info'     as const, label: '📝 Informações' },
                            { key: 'outline'  as const, label: '🔍 Outline',  badge: hasOutline ? String(currentOutline.filter(o=>o.text).length) : undefined },
                            { key: 'conteudo' as const, label: '✍️ Conteúdo', badge: hasContent ? '✓' : undefined },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '0.65rem 1.1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                                    background: 'none', border: 'none',
                                    borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                                    color: activeTab === tab.key ? 'var(--primary)' : 'var(--admin-text-subtle)',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    marginBottom: -1, transition: 'color 0.15s',
                                }}
                            >
                                {tab.label}
                                {tab.badge !== undefined && (
                                    <span style={{ fontSize: '0.68rem', padding: '0.1em 0.45em', borderRadius: 999, background: tab.badge === '✓' ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.2)', color: tab.badge === '✓' ? '#4ade80' : '#a5b4fc', fontWeight: 700 }}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* ── Aba: Outline ─────────────────────────────────────────── */}
            {activeTab === 'outline' && isEditing && (
                <>
                {/* Banner guia — aparece quando não há outline ainda */}
                {currentOutline.filter(o => o.text).length === 0 && (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🗺️</span>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.3rem' }}>Passo 2 de 3 — Estrutura da página</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-subtle)', lineHeight: 1.6 }}>
                                Pesquise <strong style={{ color: 'var(--admin-text)' }}>"{service?.title}"</strong> no Google,
                                copie as URLs dos primeiros 3-5 resultados e cole abaixo.
                                O sistema vai extrair a estrutura das páginas dos seus concorrentes automaticamente.
                            </p>
                        </div>
                    </div>
                )}
                <ServiceEditorOutline
                    serviceSlug={service!.slug}
                    initialOutline={currentOutline}
                    onSaved={(saved) => {
                        setCurrentOutline(saved);
                        // Auto-avança para a aba Conteúdo após salvar outline
                        setTimeout(() => setActiveTab('conteudo'), 400);
                    }}
                />
                </>
            )}

            {/* ── Aba: Conteúdo ─────────────────────────────────────────── */}
            {activeTab === 'conteudo' && isEditing && (
                <>
                {/* Banner guia — aparece quando não há conteúdo ainda */}
                {!service?.generatedContent && (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>✨</span>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.3rem' }}>Passo 3 de 3 — Gerar conteúdo com IA</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-subtle)', lineHeight: 1.6 }}>
                                Sua outline está pronta! Agora escolha o <strong style={{ color: 'var(--admin-text)' }}>tom de voz</strong> e clique em
                                <strong style={{ color: 'var(--admin-text)' }}> ✨ Gerar Conteúdo com IA</strong>.
                                O texto será criado automaticamente para todos os seus bairros de uma vez.
                            </p>
                        </div>
                    </div>
                )}
                {/* Banner para quem já tem conteúdo */}
                {service?.generatedContent && (
                    <div style={{ padding: '0.75rem 1.1rem', borderRadius: 8, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span>✅</span>
                        <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-subtle)' }}>
                            Esta keyword já tem conteúdo gerado. Você pode regenerar ou editar o texto abaixo.
                            {service?.contentGeneratedAt && <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>Gerado em: {service.contentGeneratedAt}</span>}
                        </p>
                    </div>
                )}
                <ServiceEditorConteudo
                    serviceSlug={service!.slug}
                    initialOutline={currentOutline}
                    initialContent={service?.generatedContent || ''}
                    generatedAt={service?.contentGeneratedAt}
                />
                </>
            )}

            {/* ── Aba: Informações ─────────────────────────────────────── */}
            {(activeTab === 'info' || !isEditing) && (<>
            <div className="admin-card p-6 space-y-5" style={{ maxWidth: 640 }}>

                {/* Keyword */}
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-1">🔑 Keyword (título) *</label>
                        <p className="text-xs text-[#737373] mb-2">É a palavra-chave exata que você quer ranquear no Google</p>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="admin-input w-full"
                            placeholder="Ex: aluguel de gerador 20kva"
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-1">🔗 Slug (URL)</label>
                        <p className="text-xs text-[#737373] mb-2">Gerado automaticamente — altere só se necessário</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#737373] font-mono whitespace-nowrap">/[bairro]/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                                className="admin-input flex-1 font-mono text-sm"
                                placeholder="aluguel-de-gerador-20kva"
                            />
                        </div>
                    </div>

                    {/* Benefícios rápidos */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-semibold text-[#e5e5e5]">✅ Diferenciais (até 4)</label>
                            {benefits.length < 4 && (
                                <button onClick={addBenefit} className="text-xs text-[#6366f1] hover:underline">+ Adicionar</button>
                            )}
                        </div>
                        <p className="text-xs text-[#737373] mb-3">Aparecem como selos na página. Ex: "Atendimento 24h", "Orçamento grátis"</p>
                        <div className="space-y-2">
                            {benefits.slice(0, 4).map((benefit, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={benefit}
                                        onChange={e => handleBenefitChange(idx, e.target.value)}
                                        className="admin-input flex-1 text-sm"
                                        placeholder={['Atendimento 24h', 'Orçamento grátis', 'Profissionais certificados', 'Garantia no serviço'][idx] || 'Diferencial'}
                                    />
                                    {benefits.length > 1 && (
                                        <button
                                            onClick={() => removeBenefit(idx)}
                                            className="text-red-400 hover:text-red-300 text-lg leading-none flex-shrink-0"
                                            title="Remover"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Thumbnail para cards na Home */}
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-1">🖼️ Thumbnail (para cards na Home)</label>
                        <p className="text-xs text-[#737373] mb-2">Imagem exibida nos cards de serviços na página inicial. Recomendado: 400×280px</p>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {(thumbnail || thumbnailPreviewBlob) ? (
                                    <div className="relative">
                                        <AdminImagePreview
                                            src={thumbnail}
                                            previewBlobUrl={thumbnailPreviewBlob}
                                            alt="Thumbnail"
                                            className="w-28 h-20 object-cover rounded-lg border border-[rgba(255,255,255,0.1)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setThumbnail(''); setThumbnailPreviewBlob(null); }}
                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500"
                                            title="Remover imagem"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-28 h-20 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[#737373] text-xs bg-[rgba(255,255,255,0.02)]">
                                        Sem imagem
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <label className="admin-btn admin-btn-secondary text-xs cursor-pointer inline-flex items-center gap-1 w-fit">
                                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={isUploadingThumbnail} />
                                    {isUploadingThumbnail ? '⏳ Enviando...' : '📤 Enviar imagem'}
                                </label>
                                <input
                                    type="text"
                                    value={thumbnail}
                                    onChange={e => setThumbnail(e.target.value)}
                                    title={thumbnail || undefined}
                                    className="admin-input text-xs w-full font-mono"
                                    placeholder="Ou cole a URL completa da imagem (ex: /images/general/1234567890-nome.jpg)"
                                />
                                {thumbnail && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(thumbnail) && !thumbnail.startsWith('https://') && (
                                    <span className="text-amber-500 text-xs">⚠️ URL incompleta: falta extensão do arquivo. Use &quot;Enviar imagem&quot; para corrigir.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Toggle ativo */}
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
                        <div>
                            <p className="text-sm font-semibold text-[#e5e5e5]">Keyword ativa</p>
                            <p className="text-xs text-[#737373]">Páginas só são geradas quando ativo</p>
                        </div>
                        <button
                            onClick={() => setActive(!active)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${active ? 'bg-green-600' : 'bg-[#3f3f3f]'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>

            </>)} {/* fecha bloco Informações */}

        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
