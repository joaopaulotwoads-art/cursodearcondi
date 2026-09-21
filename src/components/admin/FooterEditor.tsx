/**
 * FooterEditor.tsx
 * 
 * Componente React para edição do Rodapé.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface FooterLink {
    label: string;
    href: string;
}

interface FooterColumn {
    title: string;
    links: FooterLink[];
}

interface SocialLink {
    platform: string;
    url: string;
    icon: string;
}

interface FooterData {
    siteName?: string;
    copyright?: string;
    description?: string;
    columns?: FooterColumn[];
    socialLinks?: SocialLink[];
}

interface Props {
    initialData?: FooterData;
}

export default function FooterEditor({ initialData }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState<FooterData>(initialData || {});
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
            const response = await fetch('/api/admin/singletons/footer', {
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
            console.error('Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof FooterData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const addColumn = () => {
        setData(prev => ({
            ...prev,
            columns: [...(prev.columns || []), { title: '', links: [] }]
        }));
    };

    const updateColumn = (index: number, field: keyof FooterColumn, value: any) => {
        setData(prev => {
            const columns = [...(prev.columns || [])];
            columns[index] = { ...columns[index], [field]: value };
            return { ...prev, columns };
        });
    };

    const removeColumn = (index: number) => {
        setData(prev => ({
            ...prev,
            columns: (prev.columns || []).filter((_, i) => i !== index)
        }));
    };

    const addLinkToColumn = (columnIndex: number) => {
        setData(prev => {
            const columns = [...(prev.columns || [])];
            columns[columnIndex].links = [...(columns[columnIndex].links || []), { label: '', href: '' }];
            return { ...prev, columns };
        });
    };

    const updateLinkInColumn = (columnIndex: number, linkIndex: number, field: keyof FooterLink, value: string) => {
        setData(prev => {
            const columns = [...(prev.columns || [])];
            columns[columnIndex].links[linkIndex] = { ...columns[columnIndex].links[linkIndex], [field]: value };
            return { ...prev, columns };
        });
    };

    const removeLinkFromColumn = (columnIndex: number, linkIndex: number) => {
        setData(prev => {
            const columns = [...(prev.columns || [])];
            columns[columnIndex].links = columns[columnIndex].links.filter((_, i) => i !== linkIndex);
            return { ...prev, columns };
        });
    };

    const addSocialLink = () => {
        setData(prev => ({
            ...prev,
            socialLinks: [...(prev.socialLinks || []), { platform: '', url: '', icon: '' }]
        }));
    };

    const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
        setData(prev => {
            const socialLinks = [...(prev.socialLinks || [])];
            socialLinks[index] = { ...socialLinks[index], [field]: value };
            return { ...prev, socialLinks };
        });
    };

    const removeSocialLink = (index: number) => {
        setData(prev => ({
            ...prev,
            socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        Rodapé
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Edite o conteúdo do rodapé do site
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
                {/* Copyright & Description */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Informações da Empresa
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Nome do Site (exibido no rodapé)
                            </label>
                            <input
                                type="text"
                                value={data.siteName || ''}
                                onChange={(e) => updateField('siteName', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Minha Empresa"
                            />
                            <p className="text-xs text-[#737373] mt-1">
                                Nome exibido em destaque no canto esquerdo do rodapé
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Texto de Copyright
                            </label>
                            <input
                                type="text"
                                value={data.copyright || ''}
                                onChange={(e) => updateField('copyright', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: © 2024 CNX Agency. Todos os direitos reservados."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Descrição da Empresa
                            </label>
                            <textarea
                                value={data.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                className="admin-input resize-none"
                                rows={3}
                                placeholder="Ex: Transformando ideias em interfaces de alto impacto com Astro, Keystatic e Inteligência Artificial."
                            />
                            <p className="text-xs text-[#737373] mt-1">
                                Texto exibido na primeira coluna do rodapé
                            </p>
                        </div>
                    </div>
                </div>

                {/* Columns */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Colunas do Rodapé
                    </h3>
                    <div>
                        {(data.columns || []).map((column, columnIndex) => (
                            <div key={columnIndex} className="admin-card p-4 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[#a3a3a3]">
                                        Coluna {columnIndex + 1}
                                    </span>
                                    <button
                                        onClick={() => removeColumn(columnIndex)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remover Coluna
                                    </button>
                                </div>
                                <div className="space-y-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Título da Coluna
                                        </label>
                                        <input
                                            type="text"
                                            value={column.title}
                                            onChange={(e) => updateColumn(columnIndex, 'title', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: Links Rápidos"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-2">
                                            Links
                                        </label>
                                        {(column.links || []).map((link, linkIndex) => (
                                            <div key={linkIndex} className="admin-card p-3 mb-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-[#737373]">
                                                        Link {linkIndex + 1}
                                                    </span>
                                                    <button
                                                        onClick={() => removeLinkFromColumn(columnIndex, linkIndex)}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={link.label}
                                                        onChange={(e) => updateLinkInColumn(columnIndex, linkIndex, 'label', e.target.value)}
                                                        className="admin-input text-xs"
                                                        placeholder="Label"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={link.href}
                                                        onChange={(e) => updateLinkInColumn(columnIndex, linkIndex, 'href', e.target.value)}
                                                        className="admin-input text-xs"
                                                        placeholder="URL"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addLinkToColumn(columnIndex)}
                                            className="admin-btn admin-btn-secondary text-xs"
                                        >
                                            + Adicionar Link
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addColumn}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Coluna
                        </button>
                    </div>
                </div>

                {/* Social Links */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Redes Sociais
                    </h3>
                    <div>
                        {(data.socialLinks || []).map((link, index) => (
                            <div key={index} className="admin-card p-4 mb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[#a3a3a3]">
                                        Rede {index + 1}
                                    </span>
                                    <button
                                        onClick={() => removeSocialLink(index)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remover
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Plataforma
                                        </label>
                                        <input
                                            type="text"
                                            value={link.platform}
                                            onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: LinkedIn"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            URL
                                        </label>
                                        <input
                                            type="url"
                                            value={link.url}
                                            onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: https://linkedin.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Ícone
                                        </label>
                                        <input
                                            type="text"
                                            value={link.icon}
                                            onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: 💼"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addSocialLink}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Rede Social
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
