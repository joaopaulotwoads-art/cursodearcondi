/**
 * HomeEditor.tsx
 * 
 * Componente React completo para edição da página inicial institucional.
 * Inclui formulário com todos os campos: Hero, Prova Social, Quem Somos, Serviços.
 * 
 * Props:
 * - initialData: Dados iniciais da home (opcional)
 */

import React, { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface ClientLogo {
    name: string;
    logo?: string;
    url?: string;
}

interface Stat {
    number: string;
    label: string;
}

interface Service {
    title: string;
    description: string;
    icon?: string;
    url?: string;
}

interface HomeData {
    // Hero Section
    heroBadge?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroCtaText?: string;
    heroCtaUrl?: string;
    heroImage?: string;
    
    // Prova Social
    socialProofTitle?: string;
    clientLogos?: ClientLogo[];
    
    // Quem Somos
    aboutTitle?: string;
    aboutSubtitle?: string;
    aboutContent?: string;
    aboutImage?: string;
    aboutStats?: Stat[];
    
    // Artigos em Destaque
    featuredPostsLayout?: 'grid' | 'single';
    
    // Serviços
    servicesTitle?: string;
    servicesSubtitle?: string;
    services?: Service[];
    
    // Campos legados (compatibilidade)
    heroTitlePart1?: string;
    heroTitleHighlight?: string;
    heroTitlePart2?: string;
    featuresHeadline?: string;
    features?: any[];
}

interface Props {
    initialData?: HomeData;
}

export default function HomeEditor({ initialData }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState<HomeData>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Proteção contra problemas de hidratação - rodar apenas uma vez no mount
    useEffect(() => {
        setIsMounted(true);
    }, []); // Array vazio - roda apenas no mount

    // Atualizar dados quando initialData estiver disponível (após montagem)
    useEffect(() => {
        if (isMounted && initialData) {
            setData(initialData);
        } else if (isMounted && !initialData) {
            // Se não houver dados, inicializar com objeto vazio
            setData({});
        }
    }, [isMounted, initialData]);

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
            const response = await fetch('/api/admin/singletons/home', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });

            const result = await response.json();
            if (result.success) {
                showToast('success', 'Salvo com sucesso!');
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

    const updateField = (field: keyof HomeData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    // Funções para Logos de Clientes
    const addClientLogo = () => {
        setData(prev => ({
            ...prev,
            clientLogos: [...(prev.clientLogos || []), { name: '', logo: '', url: '' }]
        }));
    };

    const updateClientLogo = (index: number, field: keyof ClientLogo, value: string) => {
        setData(prev => {
            const logos = [...(prev.clientLogos || [])];
            logos[index] = { ...logos[index], [field]: value };
            return { ...prev, clientLogos: logos };
        });
    };

    const removeClientLogo = (index: number) => {
        setData(prev => ({
            ...prev,
            clientLogos: (prev.clientLogos || []).filter((_, i) => i !== index)
        }));
    };

    // Funções para Estatísticas
    const addStat = () => {
        setData(prev => ({
            ...prev,
            aboutStats: [...(prev.aboutStats || []), { number: '', label: '' }]
        }));
    };

    const updateStat = (index: number, field: keyof Stat, value: string) => {
        setData(prev => {
            const stats = [...(prev.aboutStats || [])];
            stats[index] = { ...stats[index], [field]: value };
            return { ...prev, aboutStats: stats };
        });
    };

    const removeStat = (index: number) => {
        setData(prev => ({
            ...prev,
            aboutStats: (prev.aboutStats || []).filter((_, i) => i !== index)
        }));
    };

    // Funções para Serviços
    const addService = () => {
        setData(prev => ({
            ...prev,
            services: [...(prev.services || []), { title: '', description: '', icon: '⚡', url: '' }]
        }));
    };

    const updateService = (index: number, field: keyof Service, value: string) => {
        setData(prev => {
            const services = [...(prev.services || [])];
            services[index] = { ...services[index], [field]: value };
            return { ...prev, services };
        });
    };

    const removeService = (index: number) => {
        setData(prev => ({
            ...prev,
            services: (prev.services || []).filter((_, i) => i !== index)
        }));
    };

    const handleImageUpload = async (field: 'heroImage' | 'aboutImage', e: React.ChangeEvent<HTMLInputElement>) => {
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
                updateField(field, result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
            }
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar a imagem');
        }
    };

    const handleLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
                updateClientLogo(index, 'logo', result.url);
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar o logo');
            }
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            showToast('error', 'Erro no upload', 'Não foi possível enviar o logo');
        }
    };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        Página Inicial
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Edite o conteúdo da página inicial institucional
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = '/admin/pages'}
                        className="admin-btn admin-btn-secondary"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="admin-btn admin-btn-primary disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>

            <div className="max-w-4xl space-y-6">
                {/* Hero Section */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Seção Hero
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Selo do Hero (Badge)
                            </label>
                            <input
                                type="text"
                                value={data.heroBadge || ''}
                                onChange={(e) => updateField('heroBadge', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Bem-vindo à CNX Agency"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título Principal
                            </label>
                            <input
                                type="text"
                                value={data.heroTitle || ''}
                                onChange={(e) => updateField('heroTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Transformando Ideias em Resultados Digitais"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Subtítulo
                            </label>
                            <textarea
                                value={data.heroSubtitle || ''}
                                onChange={(e) => updateField('heroSubtitle', e.target.value)}
                                className="admin-input resize-none"
                                rows={3}
                                placeholder="Descrição do hero"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                    Texto do Botão
                                </label>
                                <input
                                    type="text"
                                    value={data.heroCtaText || ''}
                                    onChange={(e) => updateField('heroCtaText', e.target.value)}
                                    className="admin-input"
                                    placeholder="Ex: Fale Conosco"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                    URL do Botão
                                </label>
                                <input
                                    type="text"
                                    value={data.heroCtaUrl || ''}
                                    onChange={(e) => updateField('heroCtaUrl', e.target.value)}
                                    className="admin-input"
                                    placeholder="Ex: /contato"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Imagem do Hero (opcional)
                            </label>
                            {data.heroImage && (
                                <div className="mb-2">
                                    <img src={data.heroImage} alt="Hero" className="max-w-xs rounded-lg mb-2" />
                                    <button
                                        onClick={() => updateField('heroImage', '')}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remover imagem
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('heroImage', e)}
                                className="admin-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Prova Social */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Prova Social (Logos de Clientes)
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título da Seção
                            </label>
                            <input
                                type="text"
                                value={data.socialProofTitle || ''}
                                onChange={(e) => updateField('socialProofTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Clientes que Confiam em Nós"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">
                                Logos de Clientes
                            </label>
                            {(data.clientLogos || []).map((logo, index) => (
                                <div key={index} className="admin-card p-4 mb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-[#a3a3a3]">
                                            Cliente {index + 1}
                                        </span>
                                        <button
                                            onClick={() => removeClientLogo(index)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                Nome do Cliente
                                            </label>
                                            <input
                                                type="text"
                                                value={logo.name}
                                                onChange={(e) => updateClientLogo(index, 'name', e.target.value)}
                                                className="admin-input text-sm"
                                                placeholder="Ex: Empresa ABC"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                Logo
                                            </label>
                                            {logo.logo && (
                                                <div className="mb-2">
                                                    <img src={logo.logo} alt={logo.name} className="max-w-32 rounded-lg mb-2" />
                                                    <button
                                                        onClick={() => updateClientLogo(index, 'logo', '')}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Remover logo
                                                    </button>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleLogoUpload(index, e)}
                                                className="admin-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                URL (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={logo.url || ''}
                                                onChange={(e) => updateClientLogo(index, 'url', e.target.value)}
                                                className="admin-input text-sm"
                                                placeholder="Ex: https://exemplo.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addClientLogo}
                                className="admin-btn admin-btn-secondary text-sm"
                            >
                                + Adicionar Logo de Cliente
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quem Somos */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Quem Somos
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título
                            </label>
                            <input
                                type="text"
                                value={data.aboutTitle || ''}
                                onChange={(e) => updateField('aboutTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Quem Somos"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Subtítulo
                            </label>
                            <input
                                type="text"
                                value={data.aboutSubtitle || ''}
                                onChange={(e) => updateField('aboutSubtitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Especialistas em desenvolvimento web moderno"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Conteúdo (Coluna Esquerda)
                            </label>
                            <textarea
                                value={data.aboutContent || ''}
                                onChange={(e) => updateField('aboutContent', e.target.value)}
                                className="admin-input resize-none"
                                rows={5}
                                placeholder="Texto sobre a empresa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Imagem (Coluna Direita)
                            </label>
                            {data.aboutImage && (
                                <div className="mb-2">
                                    <img src={data.aboutImage} alt="Quem Somos" className="max-w-xs rounded-lg mb-2" />
                                    <button
                                        onClick={() => updateField('aboutImage', '')}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remover imagem
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('aboutImage', e)}
                                className="admin-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">
                                Estatísticas (opcional)
                            </label>
                            {(data.aboutStats || []).map((stat, index) => (
                                <div key={index} className="admin-card p-3 mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-[#a3a3a3]">Estatística {index + 1}</span>
                                        <button
                                            onClick={() => removeStat(index)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={stat.number}
                                            onChange={(e) => updateStat(index, 'number', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: 100+"
                                        />
                                        <input
                                            type="text"
                                            value={stat.label}
                                            onChange={(e) => updateStat(index, 'label', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: Sites Criados"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addStat}
                                className="admin-btn admin-btn-secondary text-sm"
                            >
                                + Adicionar Estatística
                            </button>
                        </div>
                    </div>
                </div>

                {/* Artigos em Destaque */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Artigos em Destaque
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Layout dos Artigos
                            </label>
                            <select
                                value={data.featuredPostsLayout || 'grid'}
                                onChange={(e) => updateField('featuredPostsLayout', e.target.value)}
                                className="admin-input"
                            >
                                <option value="grid">Grid 3 Colunas</option>
                                <option value="single">1 Coluna</option>
                            </select>
                            <p className="text-xs text-[#a3a3a3] mt-2">
                                Escolha como os artigos em destaque serão exibidos na página inicial
                            </p>
                        </div>
                    </div>
                </div>

                {/* Serviços */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        O Que Entregamos (Serviços)
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título da Seção
                            </label>
                            <input
                                type="text"
                                value={data.servicesTitle || ''}
                                onChange={(e) => updateField('servicesTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: O Que Entregamos"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Subtítulo
                            </label>
                            <input
                                type="text"
                                value={data.servicesSubtitle || ''}
                                onChange={(e) => updateField('servicesSubtitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Soluções completas para seu negócio digital"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-3">
                                Serviços (máximo 9)
                            </label>
                            {(data.services || []).map((service, index) => (
                                <div key={index} className="admin-card p-4 mb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-[#a3a3a3]">
                                            Serviço {index + 1}
                                        </span>
                                        <button
                                            onClick={() => removeService(index)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                    Ícone (Emoji)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={service.icon || ''}
                                                    onChange={(e) => updateService(index, 'icon', e.target.value)}
                                                    className="admin-input text-sm"
                                                    placeholder="Ex: ⚡"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                    URL (opcional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={service.url || ''}
                                                    onChange={(e) => updateService(index, 'url', e.target.value)}
                                                    className="admin-input text-sm"
                                                    placeholder="Ex: /servicos/jamstack"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                Título
                                            </label>
                                            <input
                                                type="text"
                                                value={service.title}
                                                onChange={(e) => updateService(index, 'title', e.target.value)}
                                                className="admin-input text-sm"
                                                placeholder="Ex: Desenvolvimento JAMstack"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                                Descrição
                                            </label>
                                            <textarea
                                                value={service.description}
                                                onChange={(e) => updateService(index, 'description', e.target.value)}
                                                className="admin-input text-sm resize-none"
                                                rows={2}
                                                placeholder="Descrição do serviço"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addService}
                                className="admin-btn admin-btn-secondary text-sm"
                                disabled={(data.services || []).length >= 9}
                            >
                                + Adicionar Serviço {(data.services || []).length >= 9 && '(máximo 9)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
