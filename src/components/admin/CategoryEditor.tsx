/**
 * CategoryEditor.tsx
 * 
 * Componente React para edição de categorias.
 */

import { useState, useEffect } from 'react';
import { useToast, ToastList } from './Toast';

interface CategoryData {
    name: string;
    slug: string;
}

interface Props {
    category?: CategoryData;
}

export default function CategoryEditor({ category }: Props) {
    const { toasts, showToast, removeToast } = useToast();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (category) {
            setName(category.name || '');
            setSlug(category.slug || '');
        }
        console.log('✅ CategoryEditor montado', { hasCategory: !!category });
    }, [category]);

    // Gerar slug automaticamente do nome
    useEffect(() => {
        if (!category && name && !slug) {
            const generatedSlug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setSlug(generatedSlug);
        }
    }, [name, slug, category]);

    const handleSave = async () => {
        if (!name || !slug) {
            showToast('warning', 'Campos obrigatórios', 'Nome e slug são obrigatórios');
            return;
        }

        setIsSaving(true);
        try {
            const url = category ? `/api/admin/categories/${category.slug}` : '/api/admin/categories';
            const method = category ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    slug,
                    newSlug: slug !== category?.slug ? slug : undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                showToast('success', 'Categoria salva!');
                setTimeout(() => { window.location.href = '/admin/categories'; }, 800);
            } else {
                showToast('error', 'Erro ao salvar', data.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('error', 'Erro ao salvar categoria');
        } finally {
            setIsSaving(false);
        }
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

    return (
        <>
        <div className="space-y-6" style={{ minHeight: '400px' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-[#e5e5e5] mb-1">
                        {category ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                    <p className="text-sm text-[#a3a3a3]">
                        {category ? `Editando: ${category.name}` : 'Crie uma nova categoria para organizar seus posts'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = '/admin/categories'}
                        className="admin-btn admin-btn-secondary"
                    >
                        Cancelar
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

            <div className="max-w-2xl space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                        Nome *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="admin-input"
                        placeholder="Ex: Tecnologia, Negócios, etc."
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-[#e5e5e5] mb-2">
                        Slug (ID) *
                    </label>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="admin-input font-mono text-sm"
                        placeholder="slug-da-categoria"
                    />
                    <p className="text-xs text-[#737373] mt-1">
                        Usado na URL. Ex: /blog/categoria/slug-da-categoria
                    </p>
                </div>
            </div>
        </div>
        <ToastList toasts={toasts} onRemove={removeToast} />
        </>
    );
}
