/**
 * MenuEditor.tsx
 *
 * Componente React para edição do Menu de navegação e do Logo do site.
 * Suporta logo como texto personalizado ou imagem enviada via upload.
 * Os dados são salvos no singleton menu.yaml do tema ativo.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useToast, ToastList } from './Toast';
import AdminImagePreview from './AdminImagePreview';

interface MenuItem {
    label: string;
    href: string;
    icon: string;
    target: string;
}

interface MenuData {
    logoType?:  'text' | 'image';
    logoText?:  string;
    logoImage?: string;
    items?: MenuItem[];
}

interface Props {
    initialData?: MenuData;
}

export default function MenuEditor({ initialData }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [data, setData]           = useState<MenuData>(initialData || {});
    const [isSaving, setIsSaving]   = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [logoPreviewBlob, setLogoPreviewBlob] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsMounted(true);
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const updateField = <K extends keyof MenuData>(field: K, value: MenuData[K]) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    if (!isMounted) {
        return (
            <div className="space-y-6" style={{ minHeight: '400px' }}>
                <div className="p-8 text-center">
                    <p className="text-[#a3a3a3]">Carregando editor...</p>
                </div>
            </div>
        );
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const blobUrl = URL.createObjectURL(file);
        setLogoPreviewBlob(blobUrl);
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');

        try {
            const res    = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                updateField('logoImage', result.url);
                showToast('success', 'Logo enviado!', 'Clique em Salvar para aplicar.');
            } else {
                showToast('error', 'Erro no upload', 'Não foi possível enviar o logo');
            }
        } catch (err) {
            console.error('\x1b[31m✗ Erro no upload do logo:\x1b[0m', err);
            showToast('error', 'Erro no upload');
        } finally {
            URL.revokeObjectURL(blobUrl);
            setLogoPreviewBlob(null);
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/singletons/menu', {
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

    const addItem = () => {
        setData(prev => ({
            ...prev,
            items: [...(prev.items || []), { label: '', href: '', icon: '', target: '_self' }]
        }));
    };

    const updateItem = (index: number, field: keyof MenuItem, value: string) => {
        setData(prev => {
            const items = [...(prev.items || [])];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const removeItem = (index: number) => {
        setData(prev => ({
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index)
        }));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        setData(prev => {
            const items = [...(prev.items || [])];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return prev;
            [items[index], items[newIndex]] = [items[newIndex], items[index]];
            return { ...prev, items };
        });
    };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        Menu de Navegação
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        Gerencie os itens do menu principal do site
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

                {/* ── Logo do Site ─────────────────────────────────────────── */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-1">
                        🖼️ Logo do Site
                    </h3>
                    <p className="text-xs text-[#737373] mb-5">
                        Escolha entre exibir um texto ou uma imagem como logo no cabeçalho
                    </p>

                    {/* Toggle tipo */}
                    <div className="flex gap-2 mb-5">
                        <button
                            onClick={() => updateField('logoType', 'text')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                                (data.logoType || 'text') === 'text'
                                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                    : 'bg-transparent text-[#a3a3a3] border-white/10 hover:border-white/20'
                            }`}
                        >
                            ✏️ Texto
                        </button>
                        <button
                            onClick={() => updateField('logoType', 'image')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                                data.logoType === 'image'
                                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                    : 'bg-transparent text-[#a3a3a3] border-white/10 hover:border-white/20'
                            }`}
                        >
                            🖼️ Imagem
                        </button>
                    </div>

                    {/* Logo Texto */}
                    {(data.logoType || 'text') === 'text' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                    Texto do Logo
                                </label>
                                <input
                                    type="text"
                                    value={data.logoText || ''}
                                    onChange={e => updateField('logoText', e.target.value)}
                                    className="admin-input"
                                    placeholder="Ex: MinhaEmpresa"
                                    maxLength={40}
                                />
                            </div>
                            {/* Preview */}
                            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#525252] mb-2">Preview</p>
                                <span className="text-2xl font-black tracking-tighter text-white font-heading">
                                    {data.logoText || 'CNX.AGENCY'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Logo Imagem */}
                    {data.logoType === 'image' && (
                        <div className="space-y-4">
                            {(data.logoImage || logoPreviewBlob) && (
                                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <AdminImagePreview
                                        src={data.logoImage || ''}
                                        previewBlobUrl={logoPreviewBlob}
                                        alt="Logo atual"
                                        className="h-12 w-auto object-contain rounded"
                                        style={{ maxWidth: '200px' }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs text-[#737373] truncate">{data.logoImage}</p>
                                        <button
                                            onClick={() => updateField('logoImage', '')}
                                            className="text-xs text-red-400 hover:text-red-300 mt-1"
                                        >
                                            Remover imagem
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-2">
                                    {data.logoImage ? 'Substituir imagem' : 'Enviar logo'}
                                </label>
                                <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all border ${
                                    isUploading
                                        ? 'opacity-60 cursor-not-allowed border-white/10 text-[#a3a3a3]'
                                        : 'border-violet-500/40 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20'
                                }`}>
                                    {isUploading ? '⏳ Enviando...' : '📤 Escolher arquivo'}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={handleLogoUpload}
                                    />
                                </label>
                                <p className="text-[11px] text-[#525252] mt-2">
                                    PNG, SVG, WebP ou JPG — Recomendado: fundo transparente, altura ≥ 80px
                                </p>
                            </div>

                            {/* URL manual como fallback */}
                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                    Ou cole a URL da imagem
                                </label>
                                <input
                                    type="text"
                                    value={data.logoImage || ''}
                                    onChange={e => updateField('logoImage', e.target.value)}
                                    className="admin-input text-sm"
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Texto alternativo para acessibilidade */}
                            <div>
                                <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                    Texto alternativo (acessibilidade)
                                </label>
                                <input
                                    type="text"
                                    value={data.logoText || ''}
                                    onChange={e => updateField('logoText', e.target.value)}
                                    className="admin-input text-sm"
                                    placeholder="Ex: Logo da Minha Empresa"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Itens do Menu ────────────────────────────────────────── */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-heading font-bold text-[#e5e5e5] mb-4">
                        ☰ Itens do Menu
                    </h3>
                    <div>
                        {(data.items || []).map((item, index) => (
                            <div key={index} className="admin-card p-4 mb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[#a3a3a3]">
                                        Item {index + 1}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="text-xs text-[#a3a3a3] hover:text-[#e5e5e5] disabled:opacity-30"
                                            title="Mover para cima"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === (data.items?.length || 0) - 1}
                                            className="text-xs text-[#a3a3a3] hover:text-[#e5e5e5] disabled:opacity-30"
                                            title="Mover para baixo"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Label
                                        </label>
                                        <input
                                            type="text"
                                            value={item.label}
                                            onChange={(e) => updateItem(index, 'label', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: Home"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            URL
                                        </label>
                                        <input
                                            type="text"
                                            value={item.href}
                                            onChange={(e) => updateItem(index, 'href', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: /"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Ícone (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={item.icon}
                                            onChange={(e) => updateItem(index, 'icon', e.target.value)}
                                            className="admin-input text-sm"
                                            placeholder="Ex: 🏠"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#a3a3a3] mb-1">
                                            Abrir em
                                        </label>
                                        <select
                                            value={item.target}
                                            onChange={(e) => updateItem(index, 'target', e.target.value)}
                                            className="admin-input text-sm"
                                        >
                                            <option value="_self">Mesma aba</option>
                                            <option value="_blank">Nova aba</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addItem}
                            className="admin-btn admin-btn-secondary text-sm"
                        >
                            + Adicionar Item
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
