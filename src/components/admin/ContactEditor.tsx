/**
 * ContactEditor.tsx
 * 
 * Componente React para edição da página de Contato.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface SocialLink {
    platform: string;
    url: string;
    icon: string;
}

interface ContactData {
    heroTitle?: string;
    heroSubtitle?: string;
    email?: string;
    phone?: string;
    address?: string;
    socialLinks?: SocialLink[];
    formTitle?: string;
    formSubmitText?: string;
    formSuccessMessage?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    ctaButtonText?: string;
    ctaButtonUrl?: string;
}

interface Props {
    initialData?: ContactData;
    /** Tema do singleton (ex: 'classic', 'local'). Define onde os dados são salvos. */
    themeId?: string;
}

export default function ContactEditor({ initialData, themeId }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData] = useState<ContactData>(initialData || {});
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
            const response = await fetch('/api/admin/singletons/contact', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, themeId }),
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

    const updateField = (field: keyof ContactData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
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
                        Contato
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Edite o conteúdo da página de contato
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
                                Título Principal
                            </label>
                            <input
                                type="text"
                                value={data.heroTitle || ''}
                                onChange={(e) => updateField('heroTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Entre em Contato"
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
                    </div>
                </div>

                {/* Contact Info */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Informações de Contato
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={data.email || ''}
                                onChange={(e) => updateField('email', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: contato@exemplo.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Telefone
                            </label>
                            <input
                                type="text"
                                value={data.phone || ''}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: +55 (11) 9999-9999"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Endereço
                            </label>
                            <textarea
                                value={data.address || ''}
                                onChange={(e) => updateField('address', e.target.value)}
                                className="admin-input resize-none"
                                rows={3}
                                placeholder="Endereço completo"
                            />
                        </div>
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
                                            placeholder="Ex: https://linkedin.com/company"
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

                {/* Form Settings */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        Configurações do Formulário
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título do Formulário
                            </label>
                            <input
                                type="text"
                                value={data.formTitle || ''}
                                onChange={(e) => updateField('formTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Envie sua Mensagem"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Texto do Botão
                            </label>
                            <input
                                type="text"
                                value={data.formSubmitText || ''}
                                onChange={(e) => updateField('formSubmitText', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Enviar Mensagem"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Mensagem de Sucesso
                            </label>
                            <textarea
                                value={data.formSuccessMessage || ''}
                                onChange={(e) => updateField('formSuccessMessage', e.target.value)}
                                className="admin-input resize-none"
                                rows={2}
                                placeholder="Mensagem exibida após envio"
                            />
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        CTA (Call to Action)
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Título do CTA
                            </label>
                            <input
                                type="text"
                                value={data.ctaTitle || ''}
                                onChange={(e) => updateField('ctaTitle', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Vamos trabalhar juntos?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Descrição do CTA
                            </label>
                            <textarea
                                value={data.ctaDescription || ''}
                                onChange={(e) => updateField('ctaDescription', e.target.value)}
                                className="admin-input resize-none"
                                rows={3}
                                placeholder="Descrição do CTA"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                Texto do Botão (opcional)
                            </label>
                            <input
                                type="text"
                                value={data.ctaButtonText || ''}
                                onChange={(e) => updateField('ctaButtonText', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: Começar Agora"
                            />
                            <p className="text-xs text-[#737373] mt-1">
                                Deixe vazio se não quiser exibir botão
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                                URL do Botão (opcional)
                            </label>
                            <input
                                type="text"
                                value={data.ctaButtonUrl || ''}
                                onChange={(e) => updateField('ctaButtonUrl', e.target.value)}
                                className="admin-input"
                                placeholder="Ex: /contato"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
