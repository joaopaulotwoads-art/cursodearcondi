/**
 * LP1Editor.tsx
 * 
 * Componente React completo para edição da Landing Page 1 (Dot Com Secrets).
 * Inclui todos os campos editáveis: Hero, Velho vs Novo, Epifania, Mecanismo, Demo, Caminho, Depoimentos, Oferta, Garantia, FAQ, Escolha.
 * 
 * Props:
 * - initialData: Dados iniciais da LP1 (opcional)
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

// Interfaces
interface EpiphanyStat {
    number: string;
    label: string;
    icon?: string;
}

interface MechanismItem {
    number: string;
    icon: string;
    title: string;
    description: string;
}

interface DemoFeature {
    icon: string;
    title: string;
    description: string;
}

interface PathStep {
    number: string;
    icon: string;
    title: string;
    description: string;
}

interface Testimonial {
    name: string;
    role?: string;
    rating?: string;
    text: string;
    image?: string;
    videoUrl?: string;
}

interface OfferItem {
    title: string;
    description: string;
}

interface OfferBonus {
    title: string;
    description: string;
    icon?: string;
}

interface FAQItem {
    question: string;
    answer: string;
}

interface LP1Data {
    // Hero
    heroBadge?: string;
    heroTitleLine1?: string;
    heroTitleHighlight?: string;
    heroTitleLine2?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaUrl?: string;
    heroFeatures?: string;
    heroImage?: string | null;
    
    // Velho vs Novo
    oldVsNewTitle?: string;
    oldVsNewSubtitle?: string;
    oldPathTitle?: string;
    oldPathItems?: string[];
    newPathTitle?: string;
    newPathItems?: string[];
    
    // Epifania
    epiphanyTitle?: string;
    epiphanyContent?: string;
    epiphanyQuote?: string;
    epiphanyStats?: EpiphanyStat[];
    epiphanyImage?: string | null;
    
    // Mecanismo
    mechanismTitle?: string;
    mechanismItems?: MechanismItem[];
    mechanismFooter?: string;
    
    // Demo
    demoTitle?: string;
    demoDescription?: string;
    demoVideoUrl?: string;
    demoImage?: string | null;
    demoFeatures?: DemoFeature[];
    
    // Caminho
    pathTitle?: string;
    pathSubtitle?: string;
    pathSteps?: PathStep[];
    
    // Depoimentos
    testimonialsTitle?: string;
    testimonialsSubtitle?: string;
    testimonials?: Testimonial[];
    
    // Oferta
    offerTitle?: string;
    offerItems?: OfferItem[];
    offerBadge?: string;
    offerPriceTitle?: string;
    offerPriceSubtitle?: string;
    offerCtaText?: string;
    offerCtaUrl?: string;
    offerStack?: OfferItem[];
    offerBonuses?: OfferBonus[];
    
    // Garantia
    guaranteeTitle?: string;
    guaranteeText?: string;
    guaranteeBadge?: string;
    
    // FAQ
    faqTitle?: string;
    faqItems?: FAQItem[];
    
    // Escolha
    choiceTitle?: string;
    choiceOption1Title?: string;
    choiceOption1Text?: string;
    choiceOption2Title?: string;
    choiceOption2Text?: string;
    choiceCtaText?: string;
    choiceCtaUrl?: string;
    choiceFooter?: string;
}

interface Props {
    initialData?: LP1Data;
}

export default function LP1Editor({ initialData }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState<LP1Data>(initialData || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    if (!isMounted) {
        return (
            <div className="space-y-6" style={{ minHeight: '400px' }}>
                <div className="p-8 text-center">
                    <p className="text-[#a3a3a3]">Carregando editor...</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/singletons/lp1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });

            const result = await response.json();
            if (result.success) {
                showToast('success', 'Landing Page salva com sucesso!');
            } else {
                showToast('error', 'Erro ao salvar', result.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof LP1Data, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                updateField(field as keyof LP1Data, result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        }
    };

    // Funções para arrays dinâmicos
    const addArrayItem = (field: keyof LP1Data, defaultItem: any) => {
        setData(prev => ({
            ...prev,
            [field]: [...(prev[field] as any[] || []), defaultItem]
        }));
    };

    const updateArrayItem = (field: keyof LP1Data, index: number, subField: string, value: any) => {
        setData(prev => {
            const arr = [...(prev[field] as any[] || [])];
            arr[index] = { ...arr[index], [subField]: value };
            return { ...prev, [field]: arr };
        });
    };

    const removeArrayItem = (field: keyof LP1Data, index: number) => {
        setData(prev => ({
            ...prev,
            [field]: (prev[field] as any[] || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <>
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        Landing Page 1 - Dot Com Secrets
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Edite todo o conteúdo da landing page
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="admin-btn admin-btn-primary disabled:opacity-50"
                >
                    {isSaving ? 'Salvando...' : '💾 Salvar Alterações'}
                </button>
            </div>

            {/* 1. HERO SECTION */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">1. Hero Section</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge do Hero</label>
                        <input
                            type="text"
                            value={data.heroBadge || ''}
                            onChange={(e) => updateField('heroBadge', e.target.value)}
                            className="admin-input"
                            placeholder="🚀 A NOVA ERA DO DESENVOLVIMENTO WEB"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título - Linha 1</label>
                        <input
                            type="text"
                            value={data.heroTitleLine1 || ''}
                            onChange={(e) => updateField('heroTitleLine1', e.target.value)}
                            className="admin-input"
                            placeholder="SEU SITE NÃO RANQUEIA NO GOOGLE?"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título - Destaque</label>
                        <input
                            type="text"
                            value={data.heroTitleHighlight || ''}
                            onChange={(e) => updateField('heroTitleHighlight', e.target.value)}
                            className="admin-input"
                            placeholder="WORDPRESS É O PROBLEMA."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título - Linha 2</label>
                        <input
                            type="text"
                            value={data.heroTitleLine2 || ''}
                            onChange={(e) => updateField('heroTitleLine2', e.target.value)}
                            className="admin-input"
                            placeholder="A Solução JAMstack que o Google AMPLIFICA"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                        <textarea
                            value={data.heroSubtitle || ''}
                            onChange={(e) => updateField('heroSubtitle', e.target.value)}
                            className="admin-input"
                            rows={3}
                            placeholder="Enquanto sites WordPress travam..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do Botão CTA</label>
                        <input
                            type="text"
                            value={data.heroCtaText || ''}
                            onChange={(e) => updateField('heroCtaText', e.target.value)}
                            className="admin-input"
                            placeholder="QUERO RANQUEAR NO GOOGLE AGORA"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL do Botão CTA</label>
                        <input
                            type="text"
                            value={data.heroCtaUrl || ''}
                            onChange={(e) => updateField('heroCtaUrl', e.target.value)}
                            className="admin-input"
                            placeholder="#oferta"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Features do Hero</label>
                        <input
                            type="text"
                            value={data.heroFeatures || ''}
                            onChange={(e) => updateField('heroFeatures', e.target.value)}
                            className="admin-input"
                            placeholder="✅ Performance 10x superior | ✅ SEO otimizado"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Imagem do Hero (opcional)</label>
                        {data.heroImage && (
                            <img src={data.heroImage} alt="Hero" className="w-full max-w-md rounded-lg mb-2 border border-white/10" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload('heroImage', e)}
                            className="admin-input text-sm"
                        />
                        {data.heroImage && (
                            <button
                                onClick={() => updateField('heroImage', null)}
                                className="mt-2 text-sm text-red-400 hover:text-red-300"
                            >
                                Remover imagem
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. VELHO VS NOVO CAMINHO */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">2. O Velho Caminho vs O Novo Caminho</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título da Seção</label>
                        <input
                            type="text"
                            value={data.oldVsNewTitle || ''}
                            onChange={(e) => updateField('oldVsNewTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                        <textarea
                            value={data.oldVsNewSubtitle || ''}
                            onChange={(e) => updateField('oldVsNewSubtitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título - Velho Caminho</label>
                            <input
                                type="text"
                                value={data.oldPathTitle || ''}
                                onChange={(e) => updateField('oldPathTitle', e.target.value)}
                                className="admin-input"
                            />
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2 mt-4">Itens do Velho Caminho</label>
                            {(data.oldPathItems || []).map((item, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => {
                                            const items = [...(data.oldPathItems || [])];
                                            items[index] = e.target.value;
                                            updateField('oldPathItems', items);
                                        }}
                                        className="admin-input flex-1"
                                    />
                                    <button
                                        onClick={() => removeArrayItem('oldPathItems', index)}
                                        className="admin-btn admin-btn-danger text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addArrayItem('oldPathItems', '')}
                                className="admin-btn admin-btn-secondary text-sm mt-2"
                            >
                                + Adicionar Item
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título - Novo Caminho</label>
                            <input
                                type="text"
                                value={data.newPathTitle || ''}
                                onChange={(e) => updateField('newPathTitle', e.target.value)}
                                className="admin-input"
                            />
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2 mt-4">Itens do Novo Caminho</label>
                            {(data.newPathItems || []).map((item, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => {
                                            const items = [...(data.newPathItems || [])];
                                            items[index] = e.target.value;
                                            updateField('newPathItems', items);
                                        }}
                                        className="admin-input flex-1"
                                    />
                                    <button
                                        onClick={() => removeArrayItem('newPathItems', index)}
                                        className="admin-btn admin-btn-danger text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addArrayItem('newPathItems', '')}
                                className="admin-btn admin-btn-secondary text-sm mt-2"
                            >
                                + Adicionar Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PONTE DA EPIFANIA */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">3. A Ponte da Epifania</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <textarea
                            value={data.epiphanyTitle || ''}
                            onChange={(e) => updateField('epiphanyTitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Conteúdo</label>
                        <textarea
                            value={data.epiphanyContent || ''}
                            onChange={(e) => updateField('epiphanyContent', e.target.value)}
                            className="admin-input"
                            rows={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Citação em Destaque</label>
                        <textarea
                            value={data.epiphanyQuote || ''}
                            onChange={(e) => updateField('epiphanyQuote', e.target.value)}
                            className="admin-input"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Estatísticas</label>
                        {(data.epiphanyStats || []).map((stat, index) => (
                            <div key={index} className="grid grid-cols-3 gap-2 mb-2 p-3 bg-white/5 rounded-lg">
                                <input
                                    type="text"
                                    value={stat.number || ''}
                                    onChange={(e) => updateArrayItem('epiphanyStats', index, 'number', e.target.value)}
                                    className="admin-input text-sm"
                                    placeholder="Número"
                                />
                                <input
                                    type="text"
                                    value={stat.label || ''}
                                    onChange={(e) => updateArrayItem('epiphanyStats', index, 'label', e.target.value)}
                                    className="admin-input text-sm"
                                    placeholder="Rótulo"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={stat.icon || ''}
                                        onChange={(e) => updateArrayItem('epiphanyStats', index, 'icon', e.target.value)}
                                        className="admin-input text-sm flex-1"
                                        placeholder="Ícone"
                                    />
                                    <button
                                        onClick={() => removeArrayItem('epiphanyStats', index)}
                                        className="admin-btn admin-btn-danger text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('epiphanyStats', { number: '', label: '', icon: '' })}
                            className="admin-btn admin-btn-secondary text-sm mt-2"
                        >
                            + Adicionar Estatística
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Imagem (opcional)</label>
                        {data.epiphanyImage && (
                            <img src={data.epiphanyImage} alt="Epifania" className="w-full max-w-md rounded-lg mb-2 border border-white/10" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload('epiphanyImage', e)}
                            className="admin-input text-sm"
                        />
                        {data.epiphanyImage && (
                            <button
                                onClick={() => updateField('epiphanyImage', null)}
                                className="mt-2 text-sm text-red-400 hover:text-red-300"
                            >
                                Remover imagem
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. MECANISMO ÚNICO */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">4. Mecanismo Único</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <input
                            type="text"
                            value={data.mechanismTitle || ''}
                            onChange={(e) => updateField('mechanismTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Itens do Mecanismo</label>
                        {(data.mechanismItems || []).map((item, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={item.number || ''}
                                        onChange={(e) => updateArrayItem('mechanismItems', index, 'number', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Número (ex: 01)"
                                    />
                                    <input
                                        type="text"
                                        value={item.icon || ''}
                                        onChange={(e) => updateArrayItem('mechanismItems', index, 'icon', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Ícone (emoji)"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={item.title || ''}
                                    onChange={(e) => updateArrayItem('mechanismItems', index, 'title', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    placeholder="Título"
                                />
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateArrayItem('mechanismItems', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('mechanismItems', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('mechanismItems', { number: '', icon: '', title: '', description: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Item
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto Final</label>
                        <textarea
                            value={data.mechanismFooter || ''}
                            onChange={(e) => updateField('mechanismFooter', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                </div>
            </div>

            {/* 5. DEMONSTRAÇÃO TÉCNICA */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">5. Demonstração Técnica</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <textarea
                            value={data.demoTitle || ''}
                            onChange={(e) => updateField('demoTitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Descrição</label>
                        <textarea
                            value={data.demoDescription || ''}
                            onChange={(e) => updateField('demoDescription', e.target.value)}
                            className="admin-input"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL do Vídeo (opcional)</label>
                        <input
                            type="text"
                            value={data.demoVideoUrl || ''}
                            onChange={(e) => updateField('demoVideoUrl', e.target.value)}
                            className="admin-input"
                            placeholder="https://youtube.com/..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Imagem (opcional)</label>
                        {data.demoImage && (
                            <img src={data.demoImage} alt="Demo" className="w-full max-w-md rounded-lg mb-2 border border-white/10" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload('demoImage', e)}
                            className="admin-input text-sm"
                        />
                        {data.demoImage && (
                            <button
                                onClick={() => updateField('demoImage', null)}
                                className="mt-2 text-sm text-red-400 hover:text-red-300"
                            >
                                Remover imagem
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Features da Demonstração</label>
                        {(data.demoFeatures || []).map((feature, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={feature.icon || ''}
                                        onChange={(e) => updateArrayItem('demoFeatures', index, 'icon', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Ícone"
                                    />
                                    <input
                                        type="text"
                                        value={feature.title || ''}
                                        onChange={(e) => updateArrayItem('demoFeatures', index, 'title', e.target.value)}
                                        className="admin-input text-sm col-span-2"
                                        placeholder="Título"
                                    />
                                </div>
                                <textarea
                                    value={feature.description || ''}
                                    onChange={(e) => updateArrayItem('demoFeatures', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('demoFeatures', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('demoFeatures', { icon: '', title: '', description: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Feature
                        </button>
                    </div>
                </div>
            </div>

            {/* 6. O CAMINHO COMPLETO */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">6. O Caminho Completo</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <input
                            type="text"
                            value={data.pathTitle || ''}
                            onChange={(e) => updateField('pathTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                        <textarea
                            value={data.pathSubtitle || ''}
                            onChange={(e) => updateField('pathSubtitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Etapas do Caminho</label>
                        {(data.pathSteps || []).map((step, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={step.number || ''}
                                        onChange={(e) => updateArrayItem('pathSteps', index, 'number', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Número"
                                    />
                                    <input
                                        type="text"
                                        value={step.icon || ''}
                                        onChange={(e) => updateArrayItem('pathSteps', index, 'icon', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Ícone"
                                    />
                                    <input
                                        type="text"
                                        value={step.title || ''}
                                        onChange={(e) => updateArrayItem('pathSteps', index, 'title', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Título"
                                    />
                                </div>
                                <textarea
                                    value={step.description || ''}
                                    onChange={(e) => updateArrayItem('pathSteps', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('pathSteps', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('pathSteps', { number: '', icon: '', title: '', description: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Etapa
                        </button>
                    </div>
                </div>
            </div>

            {/* 7. DEPOIMENTOS */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">7. Depoimentos / Prova Social</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <input
                            type="text"
                            value={data.testimonialsTitle || ''}
                            onChange={(e) => updateField('testimonialsTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo</label>
                        <textarea
                            value={data.testimonialsSubtitle || ''}
                            onChange={(e) => updateField('testimonialsSubtitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Depoimentos</label>
                        {(data.testimonials || []).map((testimonial, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={testimonial.name || ''}
                                        onChange={(e) => updateArrayItem('testimonials', index, 'name', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Nome"
                                    />
                                    <input
                                        type="text"
                                        value={testimonial.role || ''}
                                        onChange={(e) => updateArrayItem('testimonials', index, 'role', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Cargo/Profissão"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={testimonial.rating || ''}
                                    onChange={(e) => updateArrayItem('testimonials', index, 'rating', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    placeholder="Avaliação (ex: ★★★★★)"
                                />
                                <textarea
                                    value={testimonial.text || ''}
                                    onChange={(e) => updateArrayItem('testimonials', index, 'text', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    rows={3}
                                    placeholder="Texto do depoimento"
                                />
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div>
                                        <label className="block text-xs text-[#a3a3a3] mb-1">Foto do Cliente</label>
                                        {testimonial.image && (
                                            <img src={testimonial.image} alt={testimonial.name} className="w-20 h-20 rounded-lg mb-2 border border-white/10 object-cover" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                formData.append('type', 'general');
                                                try {
                                                    const response = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                    const result = await response.json();
                                                    if (result.success) {
                                                        updateArrayItem('testimonials', index, 'image', result.url);
                                                    }
                                                } catch (error) {
                                                    showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
                                                }
                                            }}
                                            className="admin-input text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[#a3a3a3] mb-1">URL do Vídeo (opcional)</label>
                                        <input
                                            type="text"
                                            value={testimonial.videoUrl || ''}
                                            onChange={(e) => updateArrayItem('testimonials', index, 'videoUrl', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="https://youtube.com/..."
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeArrayItem('testimonials', index)}
                                    className="admin-btn admin-btn-danger text-sm"
                                >
                                    Remover Depoimento
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('testimonials', { name: '', role: '', rating: '★★★★★', text: '', image: '', videoUrl: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Depoimento
                        </button>
                    </div>
                </div>
            </div>

            {/* 8. A OFERTA */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">8. A Oferta</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <textarea
                            value={data.offerTitle || ''}
                            onChange={(e) => updateField('offerTitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Itens da Oferta</label>
                        {(data.offerItems || []).map((item, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <input
                                    type="text"
                                    value={item.title || ''}
                                    onChange={(e) => updateArrayItem('offerItems', index, 'title', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    placeholder="Título do item"
                                />
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateArrayItem('offerItems', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('offerItems', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('offerItems', { title: '', description: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Item
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge da Oferta</label>
                        <input
                            type="text"
                            value={data.offerBadge || ''}
                            onChange={(e) => updateField('offerBadge', e.target.value)}
                            className="admin-input"
                            placeholder="⚡ PERFORMANCE 10X SUPERIOR"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título do Preço</label>
                            <input
                                type="text"
                                value={data.offerPriceTitle || ''}
                                onChange={(e) => updateField('offerPriceTitle', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Subtítulo do Preço</label>
                            <input
                                type="text"
                                value={data.offerPriceSubtitle || ''}
                                onChange={(e) => updateField('offerPriceSubtitle', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do Botão CTA</label>
                            <input
                                type="text"
                                value={data.offerCtaText || ''}
                                onChange={(e) => updateField('offerCtaText', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL do Botão CTA</label>
                            <input
                                type="text"
                                value={data.offerCtaUrl || ''}
                                onChange={(e) => updateField('offerCtaUrl', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Stack de Preços</label>
                        {(data.offerStack || []).map((item, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <input
                                    type="text"
                                    value={item.title || ''}
                                    onChange={(e) => updateArrayItem('offerStack', index, 'title', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    placeholder="Título"
                                />
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateArrayItem('offerStack', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('offerStack', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('offerStack', { title: '', description: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Item da Stack
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Stack de Bônus</label>
                        {(data.offerBonuses || []).map((bonus, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={bonus.icon || ''}
                                        onChange={(e) => updateArrayItem('offerBonuses', index, 'icon', e.target.value)}
                                        className="admin-input text-sm"
                                        placeholder="Ícone"
                                    />
                                    <input
                                        type="text"
                                        value={bonus.title || ''}
                                        onChange={(e) => updateArrayItem('offerBonuses', index, 'title', e.target.value)}
                                        className="admin-input text-sm col-span-2"
                                        placeholder="Título do bônus"
                                    />
                                </div>
                                <textarea
                                    value={bonus.description || ''}
                                    onChange={(e) => updateArrayItem('offerBonuses', index, 'description', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={2}
                                    placeholder="Descrição"
                                />
                                <button
                                    onClick={() => removeArrayItem('offerBonuses', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('offerBonuses', { title: '', description: '', icon: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Bônus
                        </button>
                    </div>
                </div>
            </div>

            {/* 9. GARANTIA */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">9. Garantia</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <textarea
                            value={data.guaranteeTitle || ''}
                            onChange={(e) => updateField('guaranteeTitle', e.target.value)}
                            className="admin-input"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto da Garantia</label>
                        <textarea
                            value={data.guaranteeText || ''}
                            onChange={(e) => updateField('guaranteeText', e.target.value)}
                            className="admin-input"
                            rows={4}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Badge da Garantia</label>
                        <input
                            type="text"
                            value={data.guaranteeBadge || ''}
                            onChange={(e) => updateField('guaranteeBadge', e.target.value)}
                            className="admin-input"
                            placeholder="Garantia de Performance"
                        />
                    </div>
                </div>
            </div>

            {/* 10. FAQ */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">10. FAQ</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <input
                            type="text"
                            value={data.faqTitle || ''}
                            onChange={(e) => updateField('faqTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Perguntas Frequentes</label>
                        {(data.faqItems || []).map((faq, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg mb-3">
                                <input
                                    type="text"
                                    value={faq.question || ''}
                                    onChange={(e) => updateArrayItem('faqItems', index, 'question', e.target.value)}
                                    className="admin-input text-sm mb-2"
                                    placeholder="Pergunta"
                                />
                                <textarea
                                    value={faq.answer || ''}
                                    onChange={(e) => updateArrayItem('faqItems', index, 'answer', e.target.value)}
                                    className="admin-input text-sm"
                                    rows={3}
                                    placeholder="Resposta"
                                />
                                <button
                                    onClick={() => removeArrayItem('faqItems', index)}
                                    className="mt-2 admin-btn admin-btn-danger text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addArrayItem('faqItems', { question: '', answer: '' })}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Pergunta
                        </button>
                    </div>
                </div>
            </div>

            {/* 11. A ESCOLHA É SUA */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">11. A Escolha é Sua</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Título</label>
                        <input
                            type="text"
                            value={data.choiceTitle || ''}
                            onChange={(e) => updateField('choiceTitle', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Opção 1 - Título</label>
                            <input
                                type="text"
                                value={data.choiceOption1Title || ''}
                                onChange={(e) => updateField('choiceOption1Title', e.target.value)}
                                className="admin-input"
                            />
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2 mt-4">Opção 1 - Texto</label>
                            <textarea
                                value={data.choiceOption1Text || ''}
                                onChange={(e) => updateField('choiceOption1Text', e.target.value)}
                                className="admin-input"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Opção 2 - Título</label>
                            <input
                                type="text"
                                value={data.choiceOption2Title || ''}
                                onChange={(e) => updateField('choiceOption2Title', e.target.value)}
                                className="admin-input"
                            />
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2 mt-4">Opção 2 - Texto</label>
                            <textarea
                                value={data.choiceOption2Text || ''}
                                onChange={(e) => updateField('choiceOption2Text', e.target.value)}
                                className="admin-input"
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto do Botão Final</label>
                            <input
                                type="text"
                                value={data.choiceCtaText || ''}
                                onChange={(e) => updateField('choiceCtaText', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">URL do Botão Final</label>
                            <input
                                type="text"
                                value={data.choiceCtaUrl || ''}
                                onChange={(e) => updateField('choiceCtaUrl', e.target.value)}
                                className="admin-input"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">Texto Final</label>
                        <input
                            type="text"
                            value={data.choiceFooter || ''}
                            onChange={(e) => updateField('choiceFooter', e.target.value)}
                            className="admin-input"
                        />
                    </div>
                </div>
            </div>

            {/* Botão Salvar Final */}
            <div className="sticky bottom-0 bg-[#111111] border-t border-white/10 p-4 -mx-6 -mb-8">
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="admin-btn admin-btn-primary disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : '💾 Salvar Todas as Alterações'}
                    </button>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
